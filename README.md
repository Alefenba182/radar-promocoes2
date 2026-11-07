# Radar de Promoções

Painel móvel para configurar buscas e acompanhar ofertas com filtros de preço total e parcelamento.

## O que já está no projeto

- Painel responsivo publicado pelo GitHub Pages.
- Sessão anônima do Supabase para manter as configurações vinculadas ao navegador.
- Configuração de palavra-chave, preço máximo e quantidade máxima de parcelas.
- Conexão OAuth do Mercado Livre feita no servidor, com tokens protegidos.
- Exibição de ofertas salvas no banco, incluindo preço total, parcelas, imagem e link.
- Edge Function de coleta com renovação do token OAuth, filtros de frete grátis e limite de preço.
- Diagnóstico separado para distinguir falhas de autenticação de bloqueios no endpoint de busca.
- Script para agendar a coleta a cada 15 minutos usando pg_cron, pg_net e Supabase Vault.
- Testes automatizados no GitHub Actions.

## O que ainda depende de ativação/validação

1. Publicar a versão mais recente de `supabase/functions/scan-offers/index.ts` no Supabase.
2. Executar `supabase/schedule-scan.sql` no SQL Editor, substituindo o marcador pelo mesmo valor de `CRON_SECRET` já cadastrado nas Edge Functions. O segredo não deve ser enviado ao GitHub nem ao chat.
3. Confirmar que o Mercado Livre permite a busca autenticada para esta aplicação. A última execução retornou HTTP 403; a nova versão da função registra separadamente o resultado de `/users/me` e os detalhes seguros do erro de busca.
4. Integrar e validar as APIs oficiais de Amazon e Shopee. Elas ainda não são fontes ativas e não devem ser apresentadas como se já estivessem coletando.

## Configuração e segurança

- O projeto usa GitHub Pages para o painel e Supabase para autenticação, banco e Edge Functions.
- A chave publicável do Supabase pode ficar no frontend; `service_role`, `CRON_SECRET`, `ML_CLIENT_SECRET` e tokens OAuth devem permanecer exclusivamente no servidor/Vault.
- As políticas RLS limitam configurações e ofertas ao usuário autenticado correspondente.
- O agendador não contorna limites, bloqueios ou permissões das APIs das lojas.

## Documentação

- [Configuração do banco](supabase/README.md)
- [Conexão OAuth do Mercado Livre](supabase/MERCADOLIVRE_OAUTH_SETUP.md)
- [Publicação e diagnóstico do scanner](supabase/SCAN_OAUTH_SETUP.md)
- [Ativação do agendador de 15 minutos](supabase/SCHEDULE_SETUP.md)

## Desenvolvimento

Os commits são validados por GitHub Actions. Para executar os testes localmente:

```bash
python -m unittest discover -s tests -v
```
