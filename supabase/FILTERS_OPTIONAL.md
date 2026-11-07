# Atualização: filtros opcionais

Execute `FILTERS_OPTIONAL.sql` no SQL Editor do Supabase antes de usar a nova tela.

- Frete grátis confirmado: desativado por padrão; quando ativado, só aceita ofertas com frete grátis confirmado.
- Parcelas: "Sem limite" é o padrão; as demais opções limitam o número de parcelas.
- Se o filtro de frete estiver desativado, anúncios sem frete grátis confirmado podem aparecer, mas serão identificados como "frete a consultar; total não confirmado" quando a API não informar o custo. Não tratamos o preço do produto como preço final com frete.
