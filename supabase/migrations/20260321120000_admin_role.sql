-- Migration: Add admin role support
-- Description: Uses Supabase auth.users raw_user_meta_data to store admin status
-- The admin user (a205f3b8-fd4a-4845-9422-a6abd0da90d9) will have is_admin: true

-- Create a function to check if a user is an admin
-- This reads from auth.users.raw_user_meta_data->>'is_admin'
create or replace function is_admin_user()
returns boolean
language sql
security definer
as $$
  select coalesce(
    (select (raw_user_meta_data->>'is_admin')::boolean 
     from auth.users 
     where id = auth.uid()),
    false
  )
$$;

-- Grant execute permission to authenticated users
grant execute on function is_admin_user() to authenticated;

-- Set the admin user's metadata
-- Note: This needs to be run after the user exists
-- The user ID a205f3b8-fd4a-4845-9422-a6abd0da90d9 will be set as admin

-- Option 1: Update via SQL (run this manually if you have postgres access)
-- update auth.users 
-- set raw_user_meta_data = jsonb_set(
--   coalesce(raw_user_meta_data, '{}'::jsonb),
--   '{is_admin}',
--   'true'
-- )
-- where id = 'a205f3b8-fd4a-4845-9422-a6abd0da90d9';

-- Option 2: Use Supabase Dashboard → Authentication → Users → Edit user → Add metadata: {"is_admin": true}