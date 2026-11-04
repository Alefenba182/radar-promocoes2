import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const html = (title: string, message: string, status = 200) => {
  const safe = (value: string) => value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)}</title><body style="font:16px system-ui;max-width:560px;margin:12vh auto;padding:24px;color:#222"><h2>${safe(title)}</h2><p>${safe(message)}</p><p>Você pode fechar esta página e voltar ao Radar de Promoções.</p></body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return html("Método não permitido", "Use o endereço de autorização no navegador.", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("ML_CLIENT_ID");
  const clientSecret = Deno.env.get("ML_CLIENT_SECRET");
  // Must exactly match the Redirect URI already registered in the Mercado Livre app.\n  // The GitHub Pages callback forwards code/state to this server function.\n  const redirectUri = Deno.env.get("ML_REDIRECT_URI");

  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !redirectUri) {
    return html("Configuração incompleta", "O servidor ainda não recebeu todas as credenciais necessárias.", 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const requestUrl = new URL(req.url);

  if (requestUrl.searchParams.get("action") === "start") {
    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { error } = await admin.from("mercadolivre_oauth_states").insert({
      state_hash: await sha256(state),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) return html("Não foi possível iniciar", "Tente novamente em alguns minutos.", 500);

    const authorizationUrl = new URL("https://auth.mercadolivre.com.br/authorization");
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("state", state);
    return Response.redirect(authorizationUrl.toString(), 302);
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    return html("Autorização não concluída", requestUrl.searchParams.get("error_description") ?? providerError, 400);
  }
  if (!code || !state || !/^[a-f0-9]{64}$/.test(state)) {
    return html("Solicitação inválida", "Não recebemos um código de autorização válido.", 400);
  }

  const stateHash = await sha256(state);
  const { data: stateRow, error: stateReadError } = await admin
    .from("mercadolivre_oauth_states")
    .select("state_hash")
    .eq("state_hash", stateHash)
    .gt("expires_at", new Date().toISOString())
    .is("used_at", null)
    .maybeSingle();

  if (stateReadError || !stateRow) {
    return html("Autorização expirada", "O link expirou ou já foi utilizado. Inicie a conexão novamente.", 400);
  }

  const { data: consumed, error: consumeError } = await admin
    .from("mercadolivre_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("state_hash", stateHash)
    .is("used_at", null)
    .select("state_hash")
    .maybeSingle();
  if (consumeError || !consumed) {
    return html("Autorização já utilizada", "Inicie a conexão novamente pelo Radar.", 400);
  }

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return html("Falha ao conectar", "Não foi possível conversar com o Mercado Livre. Tente novamente.", 502);
  }

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token || !tokenPayload.refresh_token || !Number.isFinite(Number(tokenPayload.expires_in))) {
    console.error("Mercado Livre token exchange failed", tokenResponse.status, tokenPayload.error ?? "invalid_token_response");
    return html("Não foi possível autorizar", "O Mercado Livre não concluiu a autorização. Confira as credenciais e o endereço de retorno no painel.", 400);
  }

  const { data: configs, error: configError } = await admin
    .from("search_configs")
    .select("user_id")
    .limit(1);
  if (configError || !configs?.length) {
    return html("Configuração do Radar não encontrada", "Abra o painel do Radar e salve uma busca antes de conectar a loja.", 400);
  }

  const expiresAt = new Date(Date.now() + Number(tokenPayload.expires_in) * 1000).toISOString();
  const { error: saveError } = await admin.from("mercadolivre_tokens").upsert({
    user_id: configs[0].user_id,
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (saveError) {
    console.error("Could not store Mercado Livre credentials", saveError.message);
    return html("Falha ao salvar conexão", "A autorização foi recebida, mas não foi possível salvar a conexão. Tente novamente.", 500);
  }

  return html("Mercado Livre conectado!", "A autorização foi concluída e a conexão foi salva com segurança.");
});
