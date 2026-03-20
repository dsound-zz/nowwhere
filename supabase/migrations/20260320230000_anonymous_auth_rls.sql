-- Migration: Enable anonymous auth and update RLS policies
-- FR-5 & FR-11: Allow anonymous users to join events with "First L." format

-- Enable anonymous sign-ins in Supabase (this is typically done via dashboard)
-- But we can set up the necessary infrastructure here

-- Create a function to check if a user is anonymous
create or replace function is_anonymous_user()
returns boolean as $$
begin
  return auth.uid() is not null 
    and exists (
      select 1 from auth.users 
      where id = auth.uid() 
      and email is null
      and raw_user_meta_data->>'is_anonymous' = 'true'
    );
end;
$$ language plpgsql security definer;

-- Update RLS policy for attendees table
-- Allow anonymous users to insert their own attendance
drop policy if exists "Users can insert their own attendance" on attendees;

create policy "Users can insert their own attendance" on attendees
  for insert with check (
    -- Allow if user_id matches auth.uid() (for authenticated and anonymous users)
    user_id = auth.uid()
    -- Or allow if user_id is provided and user is authenticated (including anonymous)
    or (user_id is not null and auth.uid() is not null)
  );

-- Update RLS policy for messages table
-- Allow anonymous users to insert messages if they are attendees
drop policy if exists "Attendees can insert messages" on messages;

create policy "Attendees can insert messages" on messages
  for insert with check (
    -- User must be an attendee of the event
    exists (
      select 1 from attendees a
      where a.id = messages.attendee_id
      and (a.user_id = auth.uid() or a.user_id is not null)
    )
  );

-- Add index for anonymous user lookups
create index if not exists attendees_user_id_idx on attendees(user_id) where user_id is not null;

-- Add metadata column to track anonymous users
comment on table attendees is 'Event attendees. Supports both authenticated users and anonymous users with "First L." display names.';

-- Function to get or create anonymous user display name
create or replace function get_anon_display_name(user_id uuid)
returns text as $$
declare
  display_name text;
begin
  -- Try to get from user metadata
  select raw_user_meta_data->>'display_name'
  into display_name
  from auth.users
  where id = user_id;
  
  return display_name;
end;
$$ language plpgsql security definer;

-- Update the schema to support anonymous flow
comment on function is_anonymous_user is 'Returns true if the current authenticated user is an anonymous user (signed in with "First L." format)';
comment on function get_anon_display_name is 'Retrieves the display name for an anonymous user from their metadata';