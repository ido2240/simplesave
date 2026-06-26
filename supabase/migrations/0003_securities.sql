-- Collateral / securities (בטחונות). Entered manually by the advisor/operations
-- after the mortgage is signed (spec §13). Demo access mirrors the other tables:
-- RLS on with a permissive demo_all policy for the anon + authenticated roles.
create table if not exists public.securities (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  description text not null,
  kind        text not null default 'נכס',
  created_at  timestamptz not null default now()
);
create index if not exists securities_request_id_idx on public.securities (request_id);

alter table public.securities enable row level security;
drop policy if exists demo_all on public.securities;
create policy demo_all on public.securities for all to anon, authenticated using (true) with check (true);
