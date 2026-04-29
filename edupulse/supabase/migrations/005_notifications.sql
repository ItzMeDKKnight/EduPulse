-- =============================================
-- Notifications System
-- =============================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text default 'info', -- 'info', 'success', 'warning', 'error'
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);

create policy "Admins can create notifications" on notifications
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Function to create notification easily
create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'info'
) returns uuid as $$
declare
  new_id uuid;
begin
  insert into public.notifications (user_id, title, message, type)
  values (p_user_id, p_title, p_message, p_type)
  returning id into new_id;
  return new_id;
end;
$$ language plpgsql security definer;
