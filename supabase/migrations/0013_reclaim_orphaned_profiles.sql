-- Registration crashed with "Database error saving new user" (opaque
-- "ההרשמה נכשלה" in the UI) whenever the email belonged to a profile whose
-- auth user was deleted via the dashboard: profiles has no FK to auth.users,
-- so the profile row survives the deletion and handle_new_user's insert hits
-- the profiles_email_key unique constraint, rolling back the whole signup.
--
-- Fix: on signup, reclaim any orphaned profile holding the same email (its
-- request graph cascades away — the old auth identity is gone, so that data
-- is unreachable anyway), then insert the fresh profile as before.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from public.profiles p
  where p.email = new.email
    and p.id <> new.id
    and not exists (select 1 from auth.users u where u.id = p.id);

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end
$$;

-- One-time cleanup: remove profiles already orphaned by past dashboard
-- deletions (children cascade / null out per their FKs).
delete from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id);
