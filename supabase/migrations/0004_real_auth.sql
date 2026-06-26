-- Real Supabase Auth (replaces the demo mock-cookie session).
-- 1. Auto-provision a public.profiles row for every new auth user.
-- 2. Auto-confirm new users at the DB level (no SMTP configured for the demo —
--    real passwords + real sessions, email verification skipped).
-- 3. Back the seeded profiles with real email+password identities, reusing their
--    existing ids so the demo request graph stays linked.
--
-- Demo credentials: admin@ / Admin1234!, dan@ / Advisor1234!,
-- yossi@ & maya@ / Client1234!  (all @simplesave.co.il)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end
$$;

drop trigger if exists auto_confirm_user on auth.users;
create trigger auto_confirm_user
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- Real identities for the seeded profiles (idempotent).
do $$
declare
  p record;
  pw text;
begin
  for p in select id, email, full_name, role from public.profiles loop
    pw := case p.role
            when 'admin'   then 'Admin1234!'
            when 'advisor' then 'Advisor1234!'
            else 'Client1234!'
          end;
    if not exists (select 1 from auth.users where id = p.id) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        is_sso_user, is_anonymous
      ) values (
        '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email,
        extensions.crypt(pw, extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', p.full_name, 'role', p.role),
        '', '', '', '',
        false, false
      );
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), p.id, p.email,
        jsonb_build_object('sub', p.id::text, 'email', p.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;
  end loop;
end
$$;
