# Scanner autenticado do Mercado Livre

A função `scan-offers` agora usa o token OAuth salvo por `mercadolivre-oauth`, renova automaticamente o access token quando está próximo de expirar e repete uma busca uma vez se a API responder 401.

## Publicação manual no Supabase

1. Abra **Edge Functions → scan-offers → Code**.
2. Substitua o conteúdo de `index.ts` pelo arquivo `supabase/functions/scan-offers/index.ts` deste repositório.
3. Publique a função.
4. Não altere `CRON_SECRET`, `ML_CLIENT_ID` ou `ML_CLIENT_SECRET`.

O scanner continua protegido por `CRON_SECRET`. A chave de serviço do Supabase e os tokens OAuth são usados apenas no servidor.
