-- Public calculators + lead capture.
--
-- (a) /refinance and /insurance are public pages, but 0009 gave `anon` no
--     table privileges at all, so the engine silently received zero clock
--     templates / market params for logged-out visitors — the refi comparison
--     rendered only the existing-mortgage row with an empty alternatives
--     section. Grant anon read on the two non-sensitive config tables the
--     calculators need, with matching RLS select policies.
grant usage on schema public to anon;
grant select on public.economic_params, public.clock_templates to anon;
create policy economic_params_public_read on public.economic_params
  for select to anon using (true);
create policy clock_templates_public_read on public.clock_templates
  for select to anon using (true);

-- (b) Contact leads from the calculators ("המשך עם יועץ"). The leads table
--     (unused since the Python port) gains contact columns; anyone may INSERT
--     a lead, but it stays write-only for anon — reading remains staff-only
--     via the existing leads_staff policy.
alter table public.leads
  add column if not exists full_name text,
  add column if not exists phone text;
alter table public.leads alter column questionnaire set default '{}'::jsonb;
grant insert on public.leads to anon;
create policy leads_public_insert on public.leads
  for insert to anon, authenticated with check (true);
