-- C-01: profile data for every Supabase Auth user (name, phone, role).
-- Email and password live in auth.users and are handled by Supabase Auth.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'customer'
    check (role in ('customer', 'owner', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A logged-in user can read only their own profile.
-- There is no insert or update policy on purpose: users must never be able to
-- change their own role. The profile page (C-05) adds a limited update later.
grant select on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Creates the profile row when someone signs up.
-- Signup data is chosen by the user, so only 'customer' and 'owner' are accepted
-- here. Staff and admin accounts are never created from the signup form.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'User'),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    case when requested_role = 'owner' then 'owner' else 'customer' end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();