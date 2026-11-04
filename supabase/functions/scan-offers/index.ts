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
    const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
    url.searchParams.set("q", config.term);
    url.searchParams.set("limit", "50");
    url.searchParams.set("sort", "price_asc");

    try {
      const response = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "RadarDePromocoes/1.0" },
        signal: AbortSignal.timeout(15000),
      });
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

        // Only accept a known free-shipping offer so the displayed total is not understated.
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
