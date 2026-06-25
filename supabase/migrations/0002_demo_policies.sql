-- Demo access policies. Data access is server-only via the anon key + mock cookie
-- auth, so we grant the anon role full access under RLS (disabling RLS gets
-- auto-reverted by Supabase). Production would replace these with Supabase Auth
-- + policies keyed to auth.uid().
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','requests','request_details','borrowers','documents',
    'authorizations','messages','leads','economic_params','rate_bands','clock_templates'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists demo_all on public.%I;', t);
    execute format(
      'create policy demo_all on public.%I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;
