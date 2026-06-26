-- SimpleSave (Next.js) — initial schema.
-- Dedicated SimpleSave project; replaces the earlier Python-era tables.
-- DB access is server-only via the anon key + mock cookie auth (demo); RLS is
-- left disabled on app tables for the demo. Production hardening = Supabase Auth
-- (GoTrue) + RLS policies keyed to auth.uid().

drop table if exists public.messages cascade;
drop table if exists public.authorizations cascade;
drop table if exists public.documents cascade;
drop table if exists public.borrowers cascade;
drop table if exists public.request_details cascade;
drop table if exists public.requests cascade;
drop table if exists public.leads cascade;
drop table if exists public.profiles cascade;
drop table if exists public.clock_templates cascade;
drop table if exists public.rate_bands cascade;
drop table if exists public.economic_params cascade;
-- legacy Python-era tables
drop table if exists public.applications cascade;
drop table if exists public.clock_template_configs cascade;
drop table if exists public.users cascade;

create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  full_name   text not null default '',
  phone       text,
  role        text not null default 'client' check (role in ('client','advisor','admin')),
  created_at  timestamptz not null default now()
);

create table public.requests (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  advisor_id     uuid references public.profiles(id) on delete set null,
  service        text not null default 'new_mortgage',
  status         text not null default 'lead',          -- lead | clocks | registered | active
  service_status text not null default 'FREE',          -- FREE | PAID
  chosen_clock_id text,
  created_at     timestamptz not null default now()
);
create index on public.requests (client_id);
create index on public.requests (advisor_id);

create table public.request_details (
  request_id      uuid primary key references public.requests(id) on delete cascade,
  property_value  double precision not null default 0,
  equity          double precision not null default 0,
  loan_amount     double precision not null default 0,
  loan_type       text not null default 'single_property',
  property_source text not null default 'second_hand',
  term_years      int  not null default 30,
  min_pay         double precision not null default 0,
  max_pay         double precision not null default 0
);

create table public.borrowers (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references public.requests(id) on delete cascade,
  full_name         text not null default '',
  birth_date        text not null default '',
  net_income        double precision not null default 0,
  additional_income double precision not null default 0,
  fixed_expenses    double precision not null default 0,
  is_property_owner boolean not null default true
);
create index on public.borrowers (request_id);

create table public.documents (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  kind       text not null,
  file_name  text,
  status     text not null default 'לא הועלה',   -- לא הועלה | ממתין לבדיקה | תקין | דרוש תיקון
  note       text,
  updated_at timestamptz not null default now()
);
create index on public.documents (request_id);

create table public.authorizations (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  bank       text not null,
  signed     boolean not null default false,
  signed_at  timestamptz
);
create index on public.authorizations (request_id);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index on public.messages (request_id);

create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  service_type text not null,
  questionnaire jsonb not null,
  validation   jsonb,
  clocks       jsonb,
  created_at   timestamptz not null default now()
);

-- Manager-editable engine config
create table public.economic_params (
  id         text primary key default 'singleton',
  cpi        double precision not null default 0.03,
  usd        double precision not null default 0.03,
  eur        double precision not null default 0.015,
  prime_rate double precision not null default 0.0456
);

create table public.rate_bands (
  id       uuid primary key default gen_random_uuid(),
  rate_key text unique not null,
  bands    jsonb not null               -- [{from,to,anchor,margin}]
);

create table public.clock_templates (
  id            text primary key,        -- clock1..clock5
  name          text not null,
  routes        jsonb not null,          -- RouteSpec[]
  duplicate_of  text,
  display_order int not null default 0,
  recommended   boolean not null default false
);

-- Demo: RLS off on app tables (server-only access + mock auth). See note above.
alter table public.profiles        disable row level security;
alter table public.requests        disable row level security;
alter table public.request_details disable row level security;
alter table public.borrowers       disable row level security;
alter table public.documents       disable row level security;
alter table public.authorizations  disable row level security;
alter table public.messages        disable row level security;
alter table public.leads           disable row level security;
alter table public.economic_params disable row level security;
alter table public.rate_bands      disable row level security;
alter table public.clock_templates disable row level security;
