-- Enable PostGIS extension
create extension if not exists postgis;

-- Venues (registered businesses/organizers)
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,       -- used to match inbound emails
  address text,
  location geography(point, 4326),  -- PostGIS point
  category text,                    -- 'music' | 'food' | 'art' | 'sport' | 'social'
  vibe_tags text[],                 -- e.g. ['jazz', 'late night', 'free']
  verified boolean default false,
  description text,                 -- venue description for detail panel
  hours text,                       -- operating hours, e.g. 'Open until 2am'
  phone text,                       -- contact phone number
  website text,                     -- venue website (without protocol)
  rating numeric(2,1),              -- rating from 0.0 to 5.0
  created_at timestamptz default now()
);

-- Email parsing queue (created before events due to foreign key reference)
create table email_queue (
  id uuid primary key default gen_random_uuid(),
  from_address text not null,
  subject text,
  body_text text,
  body_html text,
  parsed_data jsonb,                 -- AI extraction result
  matched_venue_id uuid references venues(id),
  status text default 'pending',     -- 'pending' | 'approved' | 'rejected'
  received_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  title text not null,
  description text,
  emoji text default '📍',
  category text,
  tags text[],
  starts_at timestamptz not null,
  ends_at timestamptz,
  price_label text default 'Free',   -- 'Free' | '$' | '$$' | '$15' etc
  location geography(point, 4326),
  address text,
  status text default 'pending',     -- 'pending' | 'live' | 'expired'
  source text default 'email',       -- 'email' | 'manual' | 'scraped'
  raw_email_id uuid references email_queue(id) on delete set null,
  created_at timestamptz default now()
);

-- Index for fast radius queries
create index events_location_idx on events using gist(location);

-- Index for status queries
create index events_status_idx on events(status);

-- Index for starts_at queries
create index events_starts_at_idx on events(starts_at);

-- Anonymous attendees (join an event without full account)
create table attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,                 -- first name + initial only
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Index for attendee lookups
create index attendees_event_idx on attendees(event_id);

-- Chat messages (tied to events, expire with them)
create table messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  attendee_id uuid references attendees(id) on delete cascade,
  display_name text,
  body text not null,
  created_at timestamptz default now()
);

-- Index for message queries
create index messages_event_idx on messages(event_id);

-- Auto-expire events 2 hours after they end
create or replace function expire_events() returns void as $$
  update events 
  set status = 'expired' 
  where ends_at < now() - interval '2 hours' 
  and status = 'live';
$$ language sql;

-- Function to get events with distance and coordinates
create or replace function get_nearby_events(
  lat float,
  lng float,
  radius_m float default 1600,
  filter_category text default null,
  result_limit int default 50
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
  order by distance_m asc
  limit result_limit;
end;
$$ language plpgsql;

-- Enable Row Level Security
alter table venues enable row level security;
alter table events enable row level security;
alter table email_queue enable row level security;
alter table attendees enable row level security;
alter table messages enable row level security;

-- Public policies for venues (read-only for public)
create policy "Venues are viewable by everyone" on venues
  for select using (true);

-- Public policies for events
create policy "Live events are viewable by everyone" on events
  for select using (status = 'live' or status = 'pending');

create policy "Authenticated users can insert events" on events
  for insert with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "Service role can update events" on events
  for update using (auth.role() = 'service_role');

-- Public policies for attendees
create policy "Attendees are viewable by everyone" on attendees
  for select using (true);

create policy "Users can insert their own attendance" on attendees
  for insert with check (true);

-- Public policies for messages
create policy "Messages are viewable by everyone" on messages
  for select using (true);

create policy "Attendees can insert messages" on messages
  for insert with check (true);

-- Email queue policies (admin only)
create policy "Email queue is only accessible by service role" on email_queue
  for all using (auth.role() = 'service_role');

-- Enable Realtime on messages table
alter publication supabase_realtime add table messages;

-- Also enable Realtime on events for live updates
alter publication supabase_realtime add table events;

-- Enable Realtime on attendees for live counts
alter publication supabase_realtime add table attendees;