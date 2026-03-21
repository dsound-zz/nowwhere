-- Fix: Remove the old 5-parameter version of get_nearby_events to resolve function overloading ambiguity

-- Drop the old version with 5 parameters (from schema.sql)
drop function if exists get_nearby_events(float, float, float, text, int);

-- The 7-parameter version from 20260320220000_add_event_filters.sql will remain
-- and handles all use cases with default values for is_free_only and is_happening_now