# Ativar a coleta automática

Este projeto usa `pg_cron` para executar a Edge Function `scan-offers` a cada 15 minutos e `pg_net` para chamar o endpoint HTTP. O segredo é lido do Supabase Vault, nunca do navegador.

## Pré-requisitos

- A Edge Function `scan-offers` precisa estar publicada no projeto.
- O secret `CRON_SECRET` precisa existir em **Edge Functions → Secrets**.
- A função precisa ter `verify_jwt = false` e validar o cabeçalho Bearer com `CRON_SECRET` (já implementado).

## Ativação

1. Abra **SQL Editor** no projeto Supabase.
2. Copie `supabase/schedule-scan.sql` para uma nova consulta.
3. Substitua `COLE_AQUI_O_MESMO_CRON_SECRET` pelo mesmo valor que já está salvo como `CRON_SECRET` nas Edge Functions. Não compartilhe esse valor.
4. Execute uma única vez.
5. Confira a execução em **Database → Cron Jobs**. O nome do job é `radar-scan-every-15-minutes`.

O script guarda uma cópia do segredo no Vault com o nome `radar_cron_secret` e recria o agendamento pelo nome para evitar duplicatas. Se o segredo já existir no Vault, o script preserva o valor existente; se ele tiver sido alterado, atualize o segredo do Vault antes de executar novamente.

## Limitações atuais

O agendador apenas executa a função. Ele não contorna bloqueios ou permissões das APIs das lojas. A coleta do Mercado Livre depende de o endpoint de busca aceitar o token OAuth; Amazon e Shopee ainda dependem de acesso às respectivas APIs/credenciais e não são anunciadas como fontes ativas até serem integradas e testadas.
