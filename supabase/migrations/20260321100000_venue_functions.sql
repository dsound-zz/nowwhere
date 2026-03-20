-- Add function to get venue by ID with extracted coordinates

create or replace function get_venue_by_id(venue_id uuid)
returns table (
  id uuid,
  name text,
  email text,
  address text,
  lat float,
  lng float,
  category text,
  vibe_tags text[],
  description text,
  hours text,
  phone text,
  website text,
  rating numeric
) as $$
begin
  return query select
    v.id,
    v.name,
    v.email,
    v.address,
    ST_Y(v.location::geometry) as lat,
    ST_X(v.location::geometry) as lng,
    v.category,
    v.vibe_tags,
    v.description,
    v.hours,
    v.phone,
    v.website,
    v.rating
  from venues v
  where v.id = venue_id;
end;
$$ language plpgsql;