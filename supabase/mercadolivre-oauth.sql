-- Execute no SQL Editor do Supabase uma única vez.
-- Os tokens OAuth ficam disponíveis somente para Edge Functions com service_role.
create table if not exists public.mercadolivre_oauth_states (
  state_hash text primary key,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mercadolivre_oauth_states_expiry_idx
  on public.mercadolivre_oauth_states (expires_at);

create table if not exists public.mercadolivre_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.mercadolivre_oauth_states enable row level security;
alter table public.mercadolivre_tokens enable row level security;

revoke all on public.mercadolivre_oauth_states from public, anon, authenticated;
revoke all on public.mercadolivre_tokens from public, anon, authenticated;
grant all on public.mercadolivre_oauth_states to service_role;
grant all on public.mercadolivre_tokens to service_role;


-- Vincula cada autorização à sessão autenticada que iniciou a conexão.
alter table public.mercadolivre_oauth_states
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
