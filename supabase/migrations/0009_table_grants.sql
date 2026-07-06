-- Explicit data-privilege grants. Newer Supabase environments (local CLI v2+,
-- and hosted projects moving to secure-by-default) no longer hand anon/
-- authenticated/service_role blanket table privileges, so the app must grant
-- what it actually uses: RLS (0007) is the row filter, these are the table
-- gates. The app only ever queries as `authenticated` (cookie-bound user JWT)
-- or `service_role` (seed/admin scripts); `anon` intentionally gets nothing.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
grant usage, select on all sequences in schema public
  to authenticated, service_role;

-- Future tables created by migrations (role: postgres) get the same gates.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;
