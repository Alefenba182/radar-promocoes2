-- Execute uma vez no SQL Editor do Supabase.
-- O filtro de frete grátis é opcional e começa DESATIVADO para configurações existentes.
alter table public.search_configs
  add column if not exists free_shipping_only boolean not null default false;

-- Permite distinguir frete grátis confirmado de frete ainda não conhecido.
alter table public.offers
  add column if not exists shipping_verified boolean not null default false;
