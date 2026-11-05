import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SearchConfig = {
  user_id: string;
  term: string;
  max_price: number;
  max_installments: number;
};

type MercadoLivreItem = {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  permalink: string;
  thumbnail: string;
  shipping?: { free_shipping?: boolean };
  installments?: {
    quantity?: number;
    amount?: number;
    rate?: number;
    currency_id?: string;
  } | null;
};

type StoredToken = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  message?: string;
};

async function getAccessToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
  forceRefresh = false,
): Promise<string> {
  const { data: stored, error } = await admin
    .from("mercadolivre_tokens")
    .select("user_id,access_token,refresh_token,expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Não foi possível ler a conexão do Mercado Livre.");
  if (!stored) throw new Error("Mercado Livre ainda não está conectado para esta configuração.");

  const token = stored as StoredToken;
  const expiresSoon = new Date(token.expires_at).getTime() <= Date.now() + 60_000;
  if (!forceRefresh && !expiresSoon) return token.access_token;

  const clientId = Deno.env.get("ML_CLIENT_ID");
  const clientSecret = Deno.env.get("ML_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais OAuth do Mercado Livre ausentes no servidor.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refresh_token,
  });

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({})) as TokenPayload;

  if (!response.ok || !payload.access_token || !payload.refresh_token || !Number.isFinite(Number(payload.expires_in))) {
    console.error("Mercado Livre token refresh failed", JSON.stringify({
      http_status: response.status,
      error: payload.error ?? "invalid_token_response",
      message: payload.message ?? "No provider details",
    }));
    throw new Error("A renovação da conexão com o Mercado Livre falhou. Reconecte a conta pelo painel.");
  }

  const expiresAt = new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString();
  const { error: saveError } = await admin.from("mercadolivre_tokens").upsert({
    user_id: userId,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (saveError) throw new Error("Não foi possível salvar a renovação da conexão do Mercado Livre.");
  return payload.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Server configuration missing" }, { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: configs, error: configError } = await admin
    .from("search_configs")
    .select("user_id, term, max_price, max_installments");

  if (configError) {
    return Response.json({ error: "Could not load search configurations" }, { status: 500, headers: corsHeaders });
  }

  let checked = 0;
  let saved = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const config of (configs ?? []) as SearchConfig[]) {
    try {
      let accessToken = await getAccessToken(admin, config.user_id);
      const searchUrl = new URL("https://api.mercadolibre.com/sites/MLB/search");
      searchUrl.searchParams.set("q", config.term);
      searchUrl.searchParams.set("limit", "50");
      searchUrl.searchParams.set("sort", "price_asc");

      let response = await fetch(searchUrl, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "RadarDePromocoes/1.0",
        },
        signal: AbortSignal.timeout(20_000),
      });

      // If the access token was revoked or expired early, rotate it once and retry.
      if (response.status === 401) {
        accessToken = await getAccessToken(admin, config.user_id, true);
        response = await fetch(searchUrl, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": "RadarDePromocoes/1.0",
          },
          signal: AbortSignal.timeout(20_000),
        });
      }

      if (!response.ok) {
        errors.push(`Mercado Livre (${config.term}): HTTP ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const items = (payload.results ?? []) as MercadoLivreItem[];
      checked += items.length;
      const offers = [];

      for (const item of items) {
        const freeShipping = item.shipping?.free_shipping === true;
        const quantity = item.installments?.quantity ?? 1;
        const installmentAmount = item.installments?.amount ?? item.price;
        const installmentTotal = installmentAmount * quantity;
        const totalPrice = Math.max(Number(item.price), Number(installmentTotal));

        // Keep only offers with confirmed free shipping and known total within configured limits.
        if (!freeShipping || quantity > config.max_installments || totalPrice > config.max_price) {
          rejected++;
          continue;
        }

        offers.push({
          user_id: config.user_id,
          source: "mercado_livre",
          external_id: item.id,
          title: item.title,
          price: Number(item.price),
          total_price: Number(totalPrice),
          installments: quantity,
          installment_amount: Number(installmentAmount),
          currency: item.currency_id ?? "BRL",
          url: item.permalink,
          image_url: item.thumbnail,
          free_shipping: true,
          observed_at: new Date().toISOString(),
        });
      }

      if (offers.length) {
        const { error: saveError } = await admin.from("offers").upsert(offers, {
          onConflict: "user_id,source,external_id",
        });
        if (saveError) {
          errors.push(`Não foi possível salvar ofertas de ${config.term}: ${saveError.message}`);
        } else {
          saved += offers.length;
        }
      }
    } catch (error) {
      errors.push(`Falha na busca de ${config.term}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
  }

  return Response.json({
    status: errors.length ? "completed_with_warnings" : "completed",
    sources: ["mercado_livre"],
    configurations_found: configs?.length ?? 0,
    items_checked: checked,
    offers_saved: saved,
    offers_rejected_by_filters: rejected,
    errors,
  }, { headers: corsHeaders });
});
