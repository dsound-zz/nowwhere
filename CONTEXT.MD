# NowHere App - AI Coding Assistant Rules

## Recent Changes

### March 17, 2026 - Map Marker Rendering & Positioning Fix

**Problem Solved:** Map markers were floating around, disappearing on zoom/hover, and rushing off screen when the mouse pointer approached them.

**Root Causes:**

1. **Missing Mapbox GL CSS** - Mapbox CSS wasn't properly imported, causing incorrect marker rendering and positioning
2. **No marker anchor point** - Custom markers had no explicit anchor, causing them to float incorrectly
3. **Event bubbling issues** - Click/hover events were propagating to the map, triggering unwanted interactions
4. **Hover animations causing repositioning** - Transform effects and transitions were causing markers to shift position
5. **Dependency array issue** - Including `location` in markers useEffect caused unnecessary re-renders

**Fixes Applied:**

1. Added Mapbox GL CSS import to [`src/app/globals.css:2`](src/app/globals.css) - `@import 'mapbox-gl/dist/mapbox-gl.css';`
2. Set explicit `anchor: 'center'` for all markers in [`src/app/map/page.tsx:157-160`](src/app/map/page.tsx)
3. Added explicit width/height styles to map container in [`src/app/map/page.tsx:208-211`](src/app/map/page.tsx)
4. Removed hover effects and transform animations that caused position shifts
5. Fixed markers useEffect dependency array - removed `location` to prevent re-renders on map pan/zoom
6. Added `pointer-events-none/auto` to overlays to prevent interference with map interactions

**Key Learnings:**

- Mapbox CSS must be imported via npm package (`@import 'mapbox-gl/dist/mapbox-gl.css'`), not CDN link, for Next.js client components
- Custom Mapbox markers require explicit anchor points (`anchor: 'center'`) to position correctly
- Hover animations on map markers can cause position instability - keep markers static or use very careful CSS
- Event propagation must be carefully managed to prevent clicks/hovers from bubbling to the map

### March 17, 2026 - Seed Data & Search Radius Debug

**Problem Solved:** Events weren't appearing in the feed or map despite seed data being properly inserted into the database.

**Root Cause:**

- User's GPS location (40.692, -73.964) was ~3.9km from seed data locations (Lower East Side: 40.723, -73.987)
- Feed page search radius was only 1600m (1.6km)
- Map page search radius was only 3200m (3.2km)
- Events existed but were outside the search radius

**Fixes Applied:**

1. Increased feed page search radius: `1600m → 5000m` ([`src/app/page.tsx:103`](src/app/page.tsx))
2. Increased map page search radius: `3200m → 5000m` ([`src/app/map/page.tsx:79`](src/app/map/page.tsx))

**Debugging Process:**

1. Verified seed data was inserted (8 events, 6 venues in database)
2. Tested `get_nearby_events` SQL function directly - worked correctly
3. Checked browser console and network requests - no errors
4. Identified location mismatch in API request logs
5. Calculated distance between user location and seed data exceeded search radius

**Map Implementation:**

- Uses Mapbox GL JS with dark theme (`mapbox://styles/mapbox/dark-v11`)
- Event markers: Custom circular pins with emoji icons, color-coded by category
- Coordinate extraction: PostGIS `ST_X`/`ST_Y` via migration [`20260317190000_add_coords_to_nearby_events.sql`](supabase/migrations/20260317190000_add_coords_to_nearby_events.sql)
- Data flow: GPS → API → PostGIS function → lat/lng → Mapbox markers

**Seed Data Location:**

- Static seed data (`supabase/seed.sql`) is located in Lower East Side, NYC
- 6 venues: Nublu, Mercury Lounge, The Slipper Room, Howl Arts, Neighbours Bar, Seward Park Courts
- 8 events with relative timestamps (`now() + interval 'X hours'`)
- Run seed data: Copy `supabase/seed.sql` to Supabase SQL Editor and execute

### March 17, 2026 - MVP Completion: Auth, Pages & Features

**Problem Solved:** The app was ~75% complete with missing authentication integration, incomplete user pages (`/my-events`, `/chats`, `/settings`), non-functional filter buttons, and no email rejection flow.

## Project Overview

NowHere is a frictionless local events app showing what's happening within ~1 mile of the user's current location. Key features include location-based event feeds, real-time chat for event attendees, venue email pipelines for event creation, and automatic event expiry.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with custom theme
- **Database**: Supabase (Postgres + PostGIS + Realtime + Auth)
- **Maps**: Mapbox GL JS
- **AI Integration**: Llama 3.3 70B via Together AI (for email parsing)
- **Email**: Resend/Postmark inbound webhooks
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (REST endpoints)
│   ├── map/           # Map view page
│   └── page.tsx       # Main feed page
├── components/
│   ├── chat/          # Chat components (ChatPanel)
│   ├── events/        # Event cards and panels (EventCard, VenuePanel)
│   ├── layout/        # Layout components (Sidebar, RightPanel)
│   └── providers/     # Auth provider (SupabaseProvider)
├── lib/
│   └── supabase/      # Supabase client utilities (client.ts, server.ts)
└── types/
    └── database.ts    # TypeScript types for database schemas
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Type definitions go in `src/types/database.ts` for database-related types
- Use `@/*` path alias for imports from `src/`
- The project uses `"strict": false` in tsconfig, but prefer strict typing when possible

### React/Next.js

- Use functional components with hooks
- Use `'use client'` directive for client components
- Server Components are the default (no directive needed)
- Use Next.js App Router patterns (layout.tsx, page.tsx, route.ts)

### Styling

- Use Tailwind CSS utility classes
- Custom colors are defined in `tailwind.config.ts`:
  - `bg`, `surface`, `surface2` - Background colors
  - `border`, `border2` - Border colors
  - `text`, `muted`, `faint` - Text colors
  - `purple`, `green`, `amber`, `coral`, `blue` - Accent colors
- Use the design system colors instead of hardcoded values
- Border radius defaults: `DEFAULT: 16px`, `sm: 10px`

### API Routes

- Location: `src/app/api/`
- Use Route Handlers (route.ts files)
- Return NextResponse with appropriate status codes
- Handle CORS headers as defined in vercel.json

### Database

- Use Supabase client from `@/lib/supabase/client` (client-side) or `@/lib/supabase/server` (server-side)
- PostGIS is used for geospatial queries
- Tables: `venues`, `events`, `attendees`, `messages`, `email_queue`

### Environment Variables

Required environment variables (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `TOGETHER_AI_API_KEY` (optional, for email parsing)

## Key Patterns

### Location-Based Queries

Events are queried by proximity using PostGIS. The `/api/events/nearby` endpoint accepts latitude/longitude and returns events within a specified radius.

### Real-Time Chat

When a user joins an event, they're added to the `attendees` table and gain access to the event's chat via Supabase Realtime subscriptions.

### Email Pipeline

Venues can email events to a special address. The `/api/inbound-email` webhook receives the email, Llama 3.3 parses it, and it goes into `email_queue` for approval before creating an event.

### Event Expiry

A cron job at `/api/cron/expire-events` runs hourly (configured in vercel.json) to mark past events as expired and clean up associated data.

## Common Tasks

### Adding a New API Endpoint

1. Create directory under `src/app/api/`
2. Create `route.ts` file with HTTP method handlers (GET, POST, etc.)
3. Use appropriate Supabase client (server-side for API routes)
4. Return NextResponse with JSON data

### Adding a New Component

1. Determine if it's client or server component
2. Place in appropriate subdirectory under `src/components/`
3. Use Tailwind classes for styling
4. Export as default or named export

### Database Schema Changes

1. Update `supabase/schema.sql`
2. Create a new migration file in `supabase/migrations/`
3. Update TypeScript types in `src/types/database.ts`

## Deployment

- Configured for Vercel deployment
- Cron jobs defined in `vercel.json`
- Environment variables must be set in Vercel dashboard

## Development Tools

### Dev Seeder API

For development and demos, the app includes a seeder API to populate the database with realistic events at real venues near any location.

**Endpoints:**

- `POST /api/dev/seed?lat={lat}&lng={lng}&radius_m=1600&count=10&source=foursquare`
  - Creates events at real nearby venues
  - Parameters:
    - `lat` (required): Latitude
    - `lng` (required): Longitude
    - `radius_m` (optional, default 1600): Search radius in meters
    - `count` (optional, default 10): Number of events to generate
    - `source` (optional, default 'foursquare'): 'foursquare' or 'static'
  - Returns: `{ venues_created, events_created, attendees_created, messages_created }`

- `POST /api/dev/reset`
  - Deletes all seeded events and venues
  - Returns: `{ events_deleted, venues_deleted }`

**Venue Sources:**

1. **Foursquare Places API** (requires `FOURSQUARE_API_KEY`):
   - Fetches real venues near the specified location
   - Automatically categorizes and tags venues
   - Falls back to static venues if API key is missing or request fails

2. **Static Fallback** (`src/data/seed-venues.json`):
   - 40 curated NYC (Lower East Side) venues
   - Used when Foursquare is unavailable or `source=static`

**Event Generation:**

- Events are generated with time-relative `starts_at` and `ends_at` (never stale)
- 30% already started, 40% starting soon, 30% later tonight
- Each event gets realistic attendees (0-15 depending on timing)
- Events with 3+ attendees get chat messages (2-6 messages)

**Example Usage:**

```

**Safety:** These endpoints only work when `NODE_ENV !== 'production'`.

## Notes

- The app is designed to work without user accounts for browsing
- Users only provide a name when joining events
- Events and chats auto-expire after the event ends
- Location permission is required for the full experience
```
