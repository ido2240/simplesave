-- Live, manager-editable rate anchors. The engine overrides each route's anchor
-- by kind from these, so editing a rate in /admin/params changes the clocks.
-- Defaults are the reference simulator's anchors (fixed .0462, variable .047;
-- prime already lives in prime_rate .0456).
alter table public.economic_params
  add column if not exists fixed_anchor    double precision not null default 0.0462,
  add column if not exists variable_anchor double precision not null default 0.047;
