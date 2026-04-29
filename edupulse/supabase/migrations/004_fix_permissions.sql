-- =============================================
-- Additional Permission Fixes
-- =============================================

-- 1. Allow anonymous users to search profiles by email (required for Parent-Student linking during registration)
drop policy if exists "Anyone can search profiles by email" on profiles;
create policy "Anyone can search profiles by email" on profiles
  for select
  using (true); 
-- Note: In a production app, you might want to restrict this further, 
-- but for registration linking, the user needs to be able to find the student's ID by email.

-- 2. Ensure Admin can manage everything (double check)
-- This was mostly covered in 003, but let's ensure full 'all' coverage on key tables
drop policy if exists "Admins manage all users" on profiles;
create policy "Admins manage all users" on profiles
  for all using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 4. Secure function to allow Admin to create users without being logged out
-- This uses 'security definer' to run with elevated privileges (be careful!)
create or replace function public.admin_create_user(
  email text,
  password text,
  full_name text,
  role text
) returns uuid as $$
declare
  new_user_id uuid;
begin
  -- Check if caller is an admin
  if (select (auth.jwt() -> 'user_metadata' ->> 'role')) != 'admin' then
    raise exception 'Unauthorized: Only admins can create users';
  end if;

  -- Create user in auth.users
  insert into auth.users (email, password, raw_user_meta_data, email_confirmed_at, role, aud)
  values (
    email,
    crypt(password, gen_salt('bf')),
    jsonb_build_object('full_name', full_name, 'role', role),
    now(),
    'authenticated',
    'authenticated'
  )
  returning id into new_user_id;

  return new_user_id;
end;
$$ language plpgsql security definer;

