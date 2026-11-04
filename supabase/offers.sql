-- Execute no SQL Editor do Supabase uma única vez.
-- O service role da Edge Function grava; cada usuário autenticado só lê as próprias ofertas.
create table if not exists public.offers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  external_id text not null,
  title text not null,
  price numeric(12,2) not null check (price >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  installments integer not null default 1 check (installments between 1 and 24),
  installment_amount numeric(12,2) not null check (installment_amount >= 0),
  currency text not null default 'BRL',
  url text not null,
  image_url text,
  free_shipping boolean not null default false,
  observed_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index if not exists offers_user_observed_idx
  on public.offers (user_id, observed_at desc);

alter table public.offers enable row level security;
revoke all on public.offers from anon;
grant select on public.offers to authenticated;

drop policy if exists "Users can read their own offers" on public.offers;
create policy "Users can read their own offers"
  on public.offers for select to authenticated
  using ((select auth.uid()) = user_id);
