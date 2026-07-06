-- Tier 1-3 mockup parity domains (owner-approved GAP scope, 2026-07-06):
-- consent stamp, document checklist metadata, message read-tracking,
-- bank tender offers, executed ("active") mortgage, advisor tasks.
-- New tables follow the 0007 RLS model: per-request rows are gated by
-- can_access_request(); advisor_tasks are advisor-private (admin sees all).
-- Data grants come from 0009's default privileges (authenticated+service_role).

-- documents: the mockup checklist marks הערכת שמאי as optional
alter table public.documents
  add column if not exists required boolean not null default true;

-- profiles: terms/consent stamp captured at registration
alter table public.profiles
  add column if not exists accepted_terms_at timestamptz;

-- messages: read tracking → advisor unread badges
alter table public.messages
  add column if not exists read_at timestamptz;

-- bank tender: per-request offers (rate_pct null = bank still pending)
create table if not exists public.bank_offers (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  bank        text not null,
  note        text,
  rate_pct    double precision,
  approved    boolean not null default false,
  is_best     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists bank_offers_request_idx on public.bank_offers (request_id);

-- executed mortgage (post-signing management screen)
create table if not exists public.active_mortgages (
  request_id     uuid primary key references public.requests(id) on delete cascade,
  payments_made  int not null default 0,
  payments_total int not null default 0,
  started_at     date
);
create table if not exists public.active_tracks (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.active_mortgages(request_id) on delete cascade,
  label       text not null,
  share_pct   double precision not null default 0,
  balance     double precision not null default 0,
  rate_label  text not null default '',
  monthly     double precision not null default 0,
  years       int not null default 0
);
create index if not exists active_tracks_request_idx on public.active_tracks (request_id);

-- advisor personal tasks (mockup tasks tab)
create table if not exists public.advisor_tasks (
  id          uuid primary key default gen_random_uuid(),
  advisor_id  uuid not null references public.profiles(id) on delete cascade,
  txt         text not null,
  due         text not null default '',
  urgent      boolean not null default false,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists advisor_tasks_advisor_idx on public.advisor_tasks (advisor_id);

-- RLS
alter table public.bank_offers      enable row level security;
alter table public.active_mortgages enable row level security;
alter table public.active_tracks    enable row level security;
alter table public.advisor_tasks    enable row level security;

drop policy if exists bank_offers_all on public.bank_offers;
create policy bank_offers_all on public.bank_offers for all to authenticated
  using (public.can_access_request(request_id))
  with check (public.can_access_request(request_id));

drop policy if exists active_mortgages_all on public.active_mortgages;
create policy active_mortgages_all on public.active_mortgages for all to authenticated
  using (public.can_access_request(request_id))
  with check (public.can_access_request(request_id));

drop policy if exists active_tracks_all on public.active_tracks;
create policy active_tracks_all on public.active_tracks for all to authenticated
  using (public.can_access_request(request_id))
  with check (public.can_access_request(request_id));

drop policy if exists advisor_tasks_own on public.advisor_tasks;
create policy advisor_tasks_own on public.advisor_tasks for all to authenticated
  using (advisor_id = auth.uid() or public.app_role() = 'admin')
  with check (advisor_id = auth.uid() or public.app_role() = 'admin');

-- 0009 ran before these tables existed via default privileges; make the
-- grants explicit anyway so this migration is self-contained on any target.
grant select, insert, update, delete on
  public.bank_offers, public.active_mortgages, public.active_tracks, public.advisor_tasks
  to authenticated, service_role;
