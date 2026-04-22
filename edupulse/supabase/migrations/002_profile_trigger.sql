-- =============================================
-- Auto-create profile on user signup
-- Run this in Supabase SQL Editor
-- =============================================

-- This function creates a profile row whenever a new user signs up.
-- It reads full_name and role from auth.users.raw_user_meta_data,
-- which is set when calling supabase.auth.signUp({ options: { data: { ... } } })

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unknown'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student')::user_role
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    email = coalesce(excluded.email, profiles.email);
  return new;
end;
$$;

-- Create the trigger (drop first if it exists to be safe)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
