-- RLS fix: a client could not read the profile of their own assigned advisor,
-- so joins like messages→author:profiles returned null for advisor-authored
-- rows and the client chat crashed. Clients may see exactly the profiles of
-- advisors assigned to their requests — nothing broader.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.app_role() in ('advisor','admin')
    or exists (
      select 1 from public.requests r
      where r.advisor_id = profiles.id
        and r.client_id = auth.uid()
    )
  );
