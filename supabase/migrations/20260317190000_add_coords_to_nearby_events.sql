-- Migration: Add lat/lng columns to get_nearby_events RPC return
-- This fixes the map page which couldn't parse PostGIS WKB hex strings

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_nearby_events(float, float, float, text, int);

-- Recreate with lat/lng columns
CREATE OR REPLACE FUNCTION get_nearby_events(
  lat float,
  lng float,
  radius_m float default 1600,
  filter_category text default null,
  result_limit int default 50
)
RETURNS TABLE (
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
    (SELECT count(*) FROM attendees a WHERE a.event_id = e.id) as attendee_count,
    ST_Y(e.location::geometry) as location_lat,
    ST_X(e.location::geometry) as location_lng
  FROM events e
  WHERE 
    e.status = 'live'
    AND ST_DWithin(e.location, ST_MakePoint(lng, lat)::geography, radius_m)
    AND (filter_category IS NULL OR e.category = filter_category)
  ORDER BY distance_m ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;