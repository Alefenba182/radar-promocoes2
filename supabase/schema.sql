-- Execute este arquivo no SQL Editor do Supabase.
-- Cada usuário anônimo autenticado só pode acessar sua própria configuração.
create table if not exists public.search_configs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  term text not null default 'memória RAM DDR4 8GB',
  max_price numeric(10,2) not null default 400 check (max_price >= 0),
  max_installments integer not null default 10 check (max_installments between 1 and 24),
  updated_at timestamptz not null default now()
);

alter table public.search_configs enable row level security;

revoke all on public.search_configs from anon;
grant select, insert, update on public.search_configs to authenticated;

drop policy if exists "Users can read their own search config" on public.search_configs;
create policy "Users can read their own search config"
  on public.search_configs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own search config" on public.search_configs;
create policy "Users can insert their own search config"
  on public.search_configs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own search config" on public.search_configs;
create policy "Users can update their own search config"
  on public.search_configs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
