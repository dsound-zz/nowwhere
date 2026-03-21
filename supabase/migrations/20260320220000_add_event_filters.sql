-- Migration: Add event filters (is_free_only, is_happening_now) to get_nearby_events RPC
-- FR-18 & FR-19: Database-level filtering for free events and events happening now

-- Update the get_nearby_events function to support new filter parameters
create or replace function get_nearby_events(
  lat float,
  lng float,
  radius_m float default 1600,
  filter_category text default null,
  result_limit int default 50,
  is_free_only boolean default false,
  is_happening_now boolean default false
)
returns table (
  id uuid,
  venue_id uuid,
  title text,
  description text,
  emoji text,
  category text,
  tags text[],
  starts_at timestamptz,
  ends_at timestamptz,
  price_label text,
  address text,
  status text,
  distance_m float,
  attendee_count bigint,
  location_lat float,
  location_lng float
) as $$
begin
  return query
  select
    e.id,
    e.venue_id,
    e.title,
    e.description,
    e.emoji,
    e.category,
    e.tags,
    e.starts_at,
    e.ends_at,
    e.price_label,
    e.address,
    e.status,
    ST_Distance(e.location, ST_MakePoint(lng, lat)::geography) as distance_m,
    (select count(*) from attendees a where a.event_id = e.id) as attendee_count,
    ST_Y(e.location::geometry) as location_lat,
    ST_X(e.location::geometry) as location_lng
  from events e
  where
    e.status = 'live'
    and ST_DWithin(e.location, ST_MakePoint(lng, lat)::geography, radius_m)
    and (filter_category is null or e.category = filter_category)
    -- Free only filter: match 'Free' or '$0' or '0' price labels
    and (not is_free_only or e.price_label ilike 'Free' or e.price_label = '$0' or e.price_label = '0')
    -- Happening now filter: event has started and not yet ended
    and (not is_happening_now or (e.starts_at <= now() and (e.ends_at is null or e.ends_at >= now())))
  order by distance_m asc
  limit result_limit;
end;
$$ language plpgsql;

-- Add price column to events for easier filtering (optional enhancement)
-- This allows numeric price comparisons instead of string matching
alter table events add column if not exists price numeric default 0;

-- Create index for price queries
create index if not exists events_price_idx on events(price) where status = 'live';

-- Create composite index for common filter combinations
create index if not exists events_live_time_idx on events(starts_at, ends_at) where status = 'live';

-- Comment describing the function (specify full signature to avoid ambiguity)
comment on function get_nearby_events(float, float, float, text, int, boolean, boolean) is 'Returns nearby live events with optional filters for category, free-only, and currently happening events. Uses PostGIS for geospatial queries.';