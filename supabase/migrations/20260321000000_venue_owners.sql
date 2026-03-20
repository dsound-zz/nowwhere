-- Migration: Add venue_owners table and RLS for venue ownership
-- Allows venue owners to manage only their own venues

-- Create venue_owners table
create table if not exists venue_owners (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'owner', -- 'owner' | 'editor'
  created_at timestamptz default now(),
  unique(venue_id, user_id)
);

-- Index for venue owner lookups
create index if not exists venue_owners_venue_idx on venue_owners(venue_id);
create index if not exists venue_owners_user_idx on venue_owners(user_id);

-- Enable RLS on venue_owners
alter table venue_owners enable row level security;

-- Policy: Venue owners are viewable by the owners themselves
create policy "Venue owners can view their own ownership" on venue_owners
  for select using (user_id = auth.uid());

-- Policy: Only service role can insert venue owners (for now)
create policy "Only service role can insert venue owners" on venue_owners
  for insert with check (auth.role() = 'service_role');

-- Update RLS for venues table to allow owners to update
create policy "Venue owners can update their venues" on venues
  for update using (
    exists (
      select 1 from venue_owners vo
      where vo.venue_id = venues.id
      and vo.user_id = auth.uid()
    )
  );

-- Update RLS for events table to allow venue owners to create events
create policy "Venue owners can create events for their venues" on events
  for insert with check (
    -- Allow if venue_id is null (standalone event)
    venue_id is null
    -- Or if user owns the venue
    or exists (
      select 1 from venue_owners vo
      where vo.venue_id = events.venue_id
      and vo.user_id = auth.uid()
    )
  );

-- Update RLS for events table to allow venue owners to update events
create policy "Venue owners can update their venue events" on events
  for update using (
    exists (
      select 1 from venue_owners vo
      where vo.venue_id = events.venue_id
      and vo.user_id = auth.uid()
    )
  );

-- Function to add venue owner after magic link sign-in
create or replace function add_venue_owner(venue_id uuid)
returns void as $$
begin
  -- Add current user as owner if they have is_venue_owner in metadata
  insert into venue_owners (venue_id, user_id, role)
  select 
    venue_id,
    auth.uid(),
    'owner'
  where auth.uid() is not null
  and exists (
    select 1 from auth.users
    where id = auth.uid()
    and raw_user_meta_data->>'is_venue_owner' = 'true'
    and raw_user_meta_data->>'claiming_venue_id' = venue_id::text
  )
  on conflict (venue_id, user_id) do nothing;
end;
$$ language plpgsql security definer;

-- Function to check if user owns a venue
create or replace function user_owns_venue(check_venue_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from venue_owners
    where venue_id = check_venue_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Comments
comment on table venue_owners is 'Maps users to venues they own/edit. Created when venue owner claims their venue via magic link.';
comment on function add_venue_owner is 'Adds the current user as owner of a venue after they complete magic link sign-in.';
comment on function user_owns_venue is 'Returns true if the current authenticated user owns the specified venue.';