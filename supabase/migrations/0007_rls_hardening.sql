-- RLS hardening: replace the permissive demo_all policies with real
-- auth.uid()/role-scoped policies now that the app accesses data as the
-- authenticated user (lib/supabase-server). A logged-in user can only read
-- their own rows; advisors see assigned clients; admins see all; config tables
-- are readable by any authenticated user and writable only by admins.

-- Helpers (SECURITY DEFINER so they bypass RLS internally — no recursion).
create or replace function public.app_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_access_request(req uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.requests r
    where r.id = req
      and (r.client_id = auth.uid() or r.advisor_id = auth.uid() or public.app_role() = 'admin')
  )
$$;

-- Drop the permissive demo policy everywhere.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','requests','request_details','borrowers','documents',
    'authorizations','messages','leads','economic_params','rate_bands','clock_templates'
  ] loop
    execute format('drop policy if exists demo_all on public.%I;', t);
  end loop;
end $$;
drop policy if exists demo_all on public.securities;

-- profiles: see your own; advisors/admins can read others (names in lists).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.app_role() in ('advisor','admin'));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- requests: owner client, assigned advisor, or admin.
create policy requests_select on public.requests for select to authenticated
  using (client_id = auth.uid() or advisor_id = auth.uid() or public.app_role() = 'admin');
create policy requests_insert on public.requests for insert to authenticated
  with check (client_id = auth.uid());
create policy requests_update on public.requests for update to authenticated
  using (client_id = auth.uid() or advisor_id = auth.uid() or public.app_role() = 'admin')
  with check (client_id = auth.uid() or advisor_id = auth.uid() or public.app_role() = 'admin');

-- Per-request child tables: gated by access to the parent request.
do $$
declare t text;
begin
  foreach t in array array['request_details','borrowers','documents','authorizations','messages','securities'] loop
    execute format($f$
      create policy %1$s_all on public.%1$I for all to authenticated
        using (public.can_access_request(request_id))
        with check (public.can_access_request(request_id));
    $f$, t);
  end loop;
end $$;

-- leads: staff only.
create policy leads_staff on public.leads for all to authenticated
  using (public.app_role() in ('advisor','admin'))
  with check (public.app_role() in ('advisor','admin'));

-- Config tables: any authenticated user reads; only admin writes.
do $$
declare t text;
begin
  foreach t in array array['economic_params','rate_bands','clock_templates'] loop
    execute format('create policy %1$s_read on public.%1$I for select to authenticated using (true);', t);
    execute format($f$create policy %1$s_admin_write on public.%1$I for all to authenticated
      using (public.app_role() = 'admin') with check (public.app_role() = 'admin');$f$, t);
  end loop;
end $$;

-- Storage: documents bucket scoped to the request in the object path (reqId/...).
drop policy if exists demo_documents_all on storage.objects;
create policy documents_request_scoped on storage.objects for all to authenticated
  using (bucket_id = 'documents' and public.can_access_request(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'documents' and public.can_access_request(((storage.foldername(name))[1])::uuid));
