# Testing Guide - Dev Seeder & Map Fix

## What Was Built

This implementation adds a complete development seeding system and fixes the map markers to use real coordinates.

### 1. Fixed PostGIS RPC

- Updated `get_nearby_events` to return `location_lat` and `location_lng` columns
- Migration: `20260317190000_add_coords_to_nearby_events.sql`
- Enables direct coordinate access without parsing PostGIS WKB strings

### 2. Static Venue Dataset

- 40 real NYC venues in `src/data/seed-venues.json`
- Covers Lower East Side / East Village area
- Includes all categories: music, food, art, sport, social

### 3. Event Generator

- `src/lib/event-generator.ts`
- Generates time-relative events (never stale)
- Creates realistic attendees and chat messages
- 30% already started, 40% starting soon, 30% later tonight

### 4. Foursquare Integration

- `src/lib/foursquare.ts`
- Fetches real venues via Foursquare Places API
- Automatic category mapping and tagging
- Falls back to static venues gracefully

### 5. Dev API Endpoints

- `POST /api/dev/seed` - Creates events and venues
- `POST /api/dev/reset` - Clears all seeded data
- Protected: only works in development mode

### 6. Map Fix

- Map page now uses real `location_lat` / `location_lng`
- Removed random offset logic
- Markers appear at actual venue locations

## Testing Steps

### Prerequisites

1. **Set up Supabase:**

   ```bash
   cd nowhere-app

   # Make sure you have Supabase project configured
   # Run the new migration
   npx supabase migration up
   ```

2. **Environment Variables:**

   ```bash
   cp .env.local.example .env.local

   # Required:
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # SUPABASE_SERVICE_ROLE_KEY=...
   # NEXT_PUBLIC_MAPBOX_TOKEN=...

   # Optional (for Foursquare):
   # FOURSQUARE_API_KEY=...
   ```

3. **Start the dev server:**
   ```bash
   npm run dev
   ```

### Test 1: Seed Data with Static Venues

```bash
# Seed 10 events near Lower East Side using static venues
curl -X POST "http://localhost:3000/api/dev/seed?lat=40.7231&lng=-73.9873&count=10&source=static"

# Expected response:
# {
#   "success": true,
#   "venue_source": "static",
#   "venues_created": 10,
#   "events_created": 12-15,
#   "attendees_created": 50-100,
#   "messages_created": 20-60
# }
```

### Test 2: View Events on Feed

1. Open http://localhost:3000
2. You should see:
   - Events appear in the feed (hero card + grid)
   - Events split into "Nearby now" and "Later tonight"
   - Attendee counts showing (varies by event timing)
   - Distance shown in miles/feet
   - All events have emoji, category tags, and venue names

### Test 3: View Events on Map

1. Navigate to http://localhost:3000/map
2. You should see:
   - Map centered on user location (or default LES)
   - Event markers at **real venue locations** (not random)
   - Markers colored by category
   - Click a marker to see event details
   - Events clustered realistically around venues

**Before this fix:** Markers were scattered randomly  
**After this fix:** Markers appear at actual venue coordinates

### Test 4: Join an Event and Chat

1. Click an event card on the feed
2. Enter your name in the modal (e.g., "Test U.")
3. Click "Join"
4. Right panel should show chat with existing messages
5. Send a message - it should appear in the chat
6. Check that attendee count increases

### Test 5: Seed with Foursquare (Optional)

Only if you have `FOURSQUARE_API_KEY` configured:

```bash
# Seed events using real venues from Foursquare
curl -X POST "http://localhost:3000/api/dev/seed?lat=40.7231&lng=-73.9873&count=15&source=foursquare"

# This will fetch actual venues near the location
# and create events at those venues
```

### Test 6: Reset Seeded Data

```bash
# Clear all seeded events and venues
curl -X POST "http://localhost:3000/api/dev/reset"

# Expected response:
# {
#   "success": true,
#   "events_deleted": 12-15,
#   "venues_deleted": 10
# }
```

After reset, refresh the feed and map - they should be empty (or show only original seed.sql data if you ran that).

### Test 7: Different Locations

Seed events near different locations:

```bash
# Brooklyn (Williamsburg)
curl -X POST "http://localhost:3000/api/dev/seed?lat=40.7081&lng=-73.9571&count=10"

# Manhattan (SoHo)
curl -X POST "http://localhost:3000/api/dev/seed?lat=40.7230&lng=-74.0030&count=10"

# Change your browser location or edit defaultLocation in page.tsx
# to see events near different areas
```

## Troubleshooting

### Issue: No events appear on feed/map

**Check:**

- Did the seed API return success?
- Are events marked as `status='live'` in the database?
- Is your location within radius_m (default 1600m) of seeded venues?

**Debug query:**

```sql
-- Check seeded events in Supabase
SELECT id, title, status, starts_at,
       ST_Y(location::geometry) as lat,
       ST_X(location::geometry) as lng
FROM events
WHERE source = 'seed';
```

### Issue: Map markers still appear random

**Check:**

- Did you run the migration `20260317190000_add_coords_to_nearby_events.sql`?
- Refresh the page (hard refresh: Cmd+Shift+R / Ctrl+Shift+F5)
- Check browser console for errors

**Verify API returns coordinates:**

```bash
curl "http://localhost:3000/api/events/nearby?lat=40.7231&lng=-73.9873" | jq '.events[0] | {title, location_lat, location_lng}'
```

Should return:

```json
{
  "title": "...",
  "location_lat": 40.7264,
  "location_lng": -73.9814
}
```

### Issue: Foursquare API fails

If you see "Foursquare fetch failed" in logs:

- Check that `FOURSQUARE_API_KEY` is valid
- Verify you haven't exceeded API rate limits (1000/day on free tier)
- The system will automatically fall back to static venues

### Issue: TypeScript errors

Run type check:

```bash
npm run build
```

All types should be updated. If you see errors about `location_lat` or `location_lng`, make sure you pulled latest changes to:

- `src/types/database.ts`
- `src/app/api/events/nearby/route.ts`
- `src/app/page.tsx`
- `src/app/map/page.tsx`

## Production Notes

The dev seeder endpoints are protected:

- Only work when `NODE_ENV !== 'production'`
- Return 403 Forbidden in production
- Seeded data is marked with `source='seed'` and venue emails end in `@seed.nowhere.app`

This ensures seeded data never leaks into production.
