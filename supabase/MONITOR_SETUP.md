# Monitor automático — preparação

A função `scan-offers` é uma base segura para o agendador. Ela exige `CRON_SECRET`, lê as configurações com a chave administrativa somente no servidor e **não coleta nem anuncia ofertas ainda**. Os conectores de lojas serão implementados separadamente.

## Preparação necessária no Supabase

1. Instale/tenha acesso ao Supabase CLI para publicar a função:
   `supabase functions deploy scan-offers --project-ref vektbwbqgffonwngvvkq`
2. Gere um segredo longo e aleatório para `CRON_SECRET` e configure-o como secret da função:
   `supabase secrets set CRON_SECRET=SEU_SEGREDO`
3. A função usa automaticamente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos pelo ambiente Supabase. Nunca coloque a service role no navegador ou no repositório.

## Agendamento

O agendamento a cada 15 minutos será ativado depois de publicar a função e cadastrar o segredo no Vault do Supabase. Não habilite um cron que chame a função antes disso: as execuções falhariam. A chamada deverá enviar `Authorization: Bearer <CRON_SECRET>` e usar o endpoint `https://vektbwbqgffonwngvvkq.supabase.co/functions/v1/scan-offers`.

## Situação atual

- [x] Configurações persistidas com RLS.
- [x] Função de servidor protegida por segredo.
- [ ] Publicar a Edge Function.
- [ ] Guardar o segredo no Vault e ativar cron de 15 minutos.
- [ ] Implementar conectores e validação de preços/frete/parcelamento.
