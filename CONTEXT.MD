# NowHere App - AI Coding Assistant Rules

## Recent Changes

### March 25, 2026 - Email Approval Flow & AI Date Parsing Improvements

**Problem Solved:**

1. Admin Accuracy Dashboard was implemented but not accessible in UI (RLS policy issue)
2. Pending emails not showing in Email Review Queue
3. LLM was parsing dates with incorrect years (e.g., parsing "March 28, 2026" as 2025)
4. Email approval flow didn't auto-create venues or prevent duplicates

**Root Causes:**

1. **RLS Policy Mismatch** - `email_queue` table only allows `service_role` access, but review page tried to query directly using client-side Supabase client
2. **Missing Date Context** - AI prompt asked LLM to infer year but didn't provide current date/year
3. **No Venue Auto-Creation** - Approved emails from unmatched senders created events with `venue_id: null`
4. **No Duplicate Detection** - Approving same email twice would create duplicate venues and events

**Fixes Applied:**

1. **Admin Accuracy Dashboard Access:**
   - Created [`src/app/api/admin/email-queue/route.ts`](src/app/api/admin/email-queue/route.ts) - New API endpoint using service client
   - Updated [`src/app/admin/review/page.tsx`](src/app/admin/review/page.tsx) - Fetches via API instead of direct query
   - Added navigation links across all admin pages (venues, review, accuracy)

2. **AI Date Parsing Improvements:**
   - Updated [`src/lib/ai/prompts.ts`](src/lib/ai/prompts.ts) - Enhanced prompt with explicit date usage instructions
   - Updated [`src/app/api/inbound-email/route.ts`](src/app/api/inbound-email/route.ts) - Includes current date/year in AI requests
   - Updated [`src/lib/ingestion/tools/venue-scraper.ts`](src/lib/ingestion/tools/venue-scraper.ts) - Added date context for website scraping
   - Updated [`src/app/api/email-queue/[id]/reparse/route.ts`](src/app/api/email-queue/[id]/reparse/route.ts) - Added date context to reparse

3. **Email Approval Flow Enhancements** ([`src/app/api/email-queue/[id]/approve/route.ts`](src/app/api/email-queue/[id]/approve/route.ts)):
   - **Venue Deduplication**: Checks if venue with sender's email exists before creating
   - **Auto-Create Venues**: Creates new unverified venues from unmatched email senders with:
     - Name extracted from email address
     - Geocoded location using Mapbox API (if address provided)
     - `verified: false` status
   - **Event Deduplication**: Prevents duplicate events using:
     - Same `venue_id` + Same `title` + `starts_at` within ±6 hours window
     - Returns success with `duplicate: true` flag instead of creating duplicate

4. **Error Handling Improvements:**
   - Updated [`src/app/api/email-queue/[id]/reject/route.ts`](src/app/api/email-queue/[id]/reject/route.ts) - Better error messages with actual status
   - Updated [`src/app/api/email-queue/[id]/approve/route.ts`](src/app/api/email-queue/[id]/approve/route.ts) - Better error messages with actual status

**Complete Email Approval Flow:**

1. **Email Reception** → LLM parses → Stores in `email_queue` with `status: 'pending'`
2. **Admin Reviews** → Views in `/admin/review` dashboard
3. **Admin Approves**:
   - Checks if venue with sender email exists
   - If not → Creates new venue (auto-generated name, geocoded location, `verified: false`)
   - Checks for duplicate events (same venue + title + time within 6 hours)
   - If not duplicate → Creates event with `status: 'live'` (immediately visible to users)
   - If duplicate → Marks email approved but skips event creation
4. **Users See Event** → Shows in feed and map immediately

**Key Learnings:**

- RLS policies require API endpoints with service clients when client-side queries are restricted
- LLMs need explicit date context (current date/year) to correctly infer event dates
- Duplicate prevention should check both venues (by email) and events (by venue + title + time window)
- Auto-created venues should be marked `verified: false` to distinguish from manually added venues
- Geocoding addresses during venue creation improves event discoverability on maps

### March 21, 2026 - Venue Detail Panel Map & Event Filters Fix

**Problem Solved:**

1. Clicking on a venue opened the detail panel, but the mini map didn't render and clicking it didn't navigate to the full map
2. Event category filters (art, music, food, etc.) were failing with database errors

**Root Causes:**

1. **Missing `get_venue_by_id` function** - Migration file existed but was never applied to Supabase. Without this function, venue coordinates couldn't be extracted from PostGIS geometry, resulting in `lat: null, lng: null`.

2. **Function overloading ambiguity** - Two versions of `get_nearby_events` existed (5-param and 7-param), causing PostgreSQL to fail when choosing which to execute.

**Fixes Applied:**

1. **New migrations created and applied:**
   - [`supabase/migrations/20260321130000_fix_venue_functions.sql`](supabase/migrations/20260321130000_fix_venue_functions.sql) — Added `get_venue_by_id` and `get_venue_coords_by_id` functions
   - [`supabase/migrations/20260321140000_fix_nearby_events_overload.sql`](supabase/migrations/20260321140000_fix_nearby_events_overload.sql) — Dropped old 5-param `get_nearby_events` to resolve ambiguity

2. **Files modified:**
   - [`src/components/events/VenueDetailPanel.tsx`](src/components/events/VenueDetailPanel.tsx) — Added `pointerEvents: 'none'` to map container and `z-10` to overlay for proper click propagation
   - [`src/app/api/venues/[id]/route.ts`](src/app/api/venues/[id]/route.ts) — Added fallback RPC call for coordinate extraction
   - [`supabase/migrations/20260320220000_add_event_filters.sql`](supabase/migrations/20260320220000_add_event_filters.sql) — Fixed COMMENT statement to use full function signature

**Key Learnings:**

- PostGIS geometry columns require special functions (`ST_X`, `ST_Y`) to extract lat/lng coordinates
- PostgreSQL function overloading can cause ambiguity errors when Supabase RPC can't determine which version to use
- Mapbox canvas intercepts pointer events - use `pointerEvents: 'none'` on the canvas container to allow clicks to propagate to overlays
- Always verify migrations are applied to the remote database after creating them

### March 20, 2026 - Event Join Flow Redesign ("I'm Going" in Chat)

**What Changed:** Moved the "I'm going" button from event cards into the chat panel, allowing users to browse and participate in chats before committing to attend.

**Previous Flow:**

- User clicks event card → "I'm going" button shown (or triggers join modal for anonymous users)
- Must join event before viewing chat
- Chat only accessible after commitment

**New Flow:**

- User clicks event card → Chat opens immediately (read/write)
- "I'm going! 🎉" button shown below message input for non-joined users
- Typing a message and pressing send automatically joins + sends "I'm going! 🎉" + user's message
- Lower friction: users can explore conversations before deciding

**Files Modified:**

- [`src/components/events/EventCard.tsx`](src/components/events/EventCard.tsx)
  - Removed `onJoin` prop and "I'm going →" button from hero variant
  - Changed text to "going · tap to chat"
  - Card clicks now always open chat panel

- [`src/components/chat/ChatPanel.tsx`](src/components/chat/ChatPanel.tsx)
  - Made `attendeeId` and `displayName` optional (can be `null`)
  - Added `onJoin` callback prop for join-from-chat functionality
  - Message input always visible (for joined and non-joined users)
  - "I'm going! 🎉" button appears below input for non-joined users
  - `handleJoinAndSend()` joins + sends "I'm going! 🎉" + user's message

- [`src/app/page.tsx`](src/app/page.tsx)
  - `handleEventClick` opens chat directly without join prompt
  - Added `handleJoinFromChat` callback for ChatPanel
  - `confirmJoin` now sends "I'm going! 🎉" message after joining
  - Removed `onJoin` prop from EventCard usages

- [`src/app/map/page.tsx`](src/app/map/page.tsx)
  - Removed floating "Join" button overlay
  - Renamed `handleJoin` to `handleJoinFromChat` with return value
  - ChatPanel handles join button internally

**Key Learnings:**

- Users want to "try before they buy" - let them chat before committing
- Chat input always visible creates a more inviting experience
- Anonymous auth must be enabled in Supabase Dashboard for anonymous users to join
- User-event relationship stored in `attendees` table: `(event_id, user_id, display_name)`

### March 20, 2026 - Venue Management & Ownership System

**What Changed:** Added complete venue management system with admin UI, Foursquare integration, and venue ownership claims.

**Features:**

- **Admin Venue Dashboard** (`/admin/venues`)
  - Search Foursquare Places API for local venues
  - Import venues directly into database with one click
  - View all venues with their event counts
  - Quick-add events to any venue

- **Claim Venue Flow**
  - "Claim this Venue" button on VenueDetailPanel
  - Sends Supabase Magic Link to venue's registered email
  - Authenticates venue owner without password
  - Redirects to venue management page after verification

- **Venue Owner Management** (`/admin/venues/[id]/manage`)
  - Venue owners can create/edit/delete their own events
  - Full CRUD for events with emoji picker, categories, pricing
  - Ownership verified via RLS policies

**Files Created:**

- [`src/app/admin/venues/page.tsx`](src/app/admin/venues/page.tsx) — Admin venue dashboard with Foursquare search
- [`src/app/admin/venues/[id]/manage/page.tsx`](src/app/admin/venues/[id]/manage/page.tsx) — Venue owner management page
- [`src/app/api/foursquare/search/route.ts`](src/app/api/foursquare/search/route.ts) — Foursquare Places API search
- [`src/app/api/venues/route.ts`](src/app/api/venues/route.ts) — Venue CRUD API
- [`src/app/api/venues/[id]/claim/route.ts`](src/app/api/venues/[id]/claim/route.ts) — Claim venue with magic link
- [`src/app/api/events/route.ts`](src/app/api/events/route.ts) — Event creation API
- [`src/app/api/events/[id]/route.ts`](src/app/api/events/[id]/route.ts) — Event PATCH/DELETE for owners
- [`src/supabase/migrations/20260321000000_venue_owners.sql`](supabase/migrations/20260321000000_venue_owners.sql) — Venue owners table + RLS

**Files Modified:**

- [`src/components/events/VenueDetailPanel.tsx`](src/components/events/VenueDetailPanel.tsx) — Added "Claim this Venue" button
- [`src/app/api/events/[id]/join/route.ts`](src/app/api/events/[id]/join/route.ts) — Updated to use proper Supabase signInAnonymously()
- [`src/types/database.ts`](src/types/database.ts) — Added venue_owners table types

**Key Learnings:**

- Foursquare API can be used without key (returns mock data in dev)
- Venue owners need magic link flow to avoid password friction
- RLS policies must allow venue owners to INSERT/UPDATE events for their venues
- Service client required for operations that bypass RLS (admin imports)

### March 20, 2026 - Event Join State Persistence Fix

**Problem Solved:** Clicking on an already-joined event card triggered a 400 error ("Already joined this event") instead of opening the chat panel. The app lost track of joined events on page refresh because attendee state wasn't persisted.

**Root Cause:**

- `attendeeId` state was only set when joining during the current session
- Page refreshes cleared this state, so clicking an event attempted to re-join
- API correctly rejected duplicate joins (PostgreSQL unique constraint error code 23505)

**Fixes Applied:**

1. **New API endpoint** [`src/app/api/events/my-attendances/route.ts`](src/app/api/events/my-attendances/route.ts)
   - Fetches all events the authenticated user has joined
   - Returns attendee IDs, display names, and event status
   - Returns empty array for anonymous users

2. **State tracking in main feed** [`src/app/page.tsx`](src/app/page.tsx)
   - Added `joinedEvents` state map: `{ eventId → { attendeeId, displayName } }`
   - Fetches joined events on mount for authenticated users
   - `handleEventClick` checks if already joined → opens chat directly
   - Updates map when successfully joining a new event
   - Edge case handling: re-fetches if "Already joined" error occurs

**Key Learnings:**

- User session state should be reconstructed from database on page load
- Error messages can be used as signals to sync client state with server state
- Attendee tracking needs to work for both authenticated users and anonymous users with display names

### March 20, 2026 - Venue Detail Side Panel

**What Changed:** Added interactive venue detail panel that slides in from the right when clicking on a venue.

**Features:**

- Click venue name on EventCard → opens venue detail panel
- Click venue in Venues tab → opens venue detail panel
- Panel contains: venue name, category, description, address, hours, rating, vibe tags, contact info
- Mini interactive Mapbox GL map (dark-v11 style) with venue marker
- Click map → navigates to `/map?lat=X&lng=Y&zoom=16&venue=Name`
- Click backdrop or X button → closes panel
- Smooth slide-in animation (300ms)

**Files Created:**

- [`src/data/mock-venue-details.ts`](src/data/mock-venue-details.ts) — Mock venue data with descriptions, hours, ratings, coordinates
- [`src/components/events/VenueDetailPanel.tsx`](src/components/events/VenueDetailPanel.tsx) — Slide-in panel component with mini Mapbox map

**Files Modified:**

- [`src/app/page.tsx`](src/app/page.tsx) — Added `selectedVenue` state, `handleVenueClick` handler, renders `VenueDetailPanel`
- [`src/components/events/EventCard.tsx`](src/components/events/EventCard.tsx) — Added `onVenueClick` prop, clickable venue name with teal styling
- [`src/components/events/VenuePanel.tsx`](src/components/events/VenuePanel.tsx) — Added `onVenueClick` prop, wired to venue card clicks
- [`src/app/globals.css`](src/app/globals.css) — Added `slideInRight` and `fadeIn` animations

**Key Learnings:**

- Mapbox GL maps in slide-in panels work well with proper cleanup in `useEffect` return
- Click propagation must be stopped on interactive children (`e.stopPropagation()`) to prevent parent handlers from firing
- Panel z-index (40) sits below modals (50) but above main content
- **ID mismatch solution**: Database uses UUID venue IDs, mock data uses custom IDs. Implemented dual lookup: try ID first, fallback to name-based matching via `getVenueByName()`

### March 20, 2026 - Design System Refresh: Soft Teal + OpenMoji

**What Changed:** Complete visual refresh replacing purple accent with soft teal and native emojis with OpenMoji SVGs.

**Color Updates:**

- Primary accent: `#7b6ef6` (purple) → `#5BB5A2` (soft teal)
- Music category: Now uses distinct indigo `#7C6EF6` (previously shared purple with primary)
- All other accent colors unchanged (green, amber, coral, blue)
- Updated all components, buttons, links, active states, hover states

**Emoji Integration:**

- Replaced all native Unicode emojis with OpenMoji SVGs
- New [`src/lib/emoji.ts`](src/lib/emoji.ts) utility converts emoji characters to CDN URLs
- New [`src/components/ui/Emoji.tsx`](src/components/ui/Emoji.tsx) component with native fallback
- Map markers now use OpenMoji images via img tags
- No database changes - emojis still stored as native characters

**Files Modified:**

- Design tokens: [`globals.css`](src/app/globals.css), [`tailwind.config.ts`](tailwind.config.ts)
- All components referencing purple or rendering emojis (15 files total)
- Complete list in [`plans/style-token-refresh.md`](../plans/style-token-refresh.md)

**Visual Impact:** Mood shifted from "nightclub VIP" to "neighborhood cafe" - warmer, more approachable, distinctively quirky with hand-drawn emoji aesthetic.

## Recent Changes (Continued)

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
- Custom colors are defined in [`tailwind.config.ts`](tailwind.config.ts):
  - `bg`, `surface`, `surface2` - Background colors (dark theme)
  - `border`, `border2` - Border colors
  - `text`, `muted`, `faint` - Text colors
  - **Primary accent**: `teal` (`#5BB5A2`) - buttons, links, active states, brand elements
  - **Category colors**:
    - `indigo` (`#7C6EF6`) - Music category only
    - `green` (`#3ecf8e`) - Food category, success states
    - `amber` (`#f5a623`) - Art category, warnings
    - `coral` (`#f06449`) - Social category, errors
    - `blue` (`#4f9cf9`) - Sport category, secondary accents
- Use design system color tokens instead of hardcoded values
- Border radius defaults: `DEFAULT: 16px`, `sm: 10px`

### Emoji Rendering

- **Use OpenMoji component for all emoji displays**
- Import: `import { Emoji } from '@/components/ui/Emoji'`
- Usage: `<Emoji emoji="🎷" size={24} />`
- Renders OpenMoji SVGs from CDN with native emoji fallback
- Utility functions in [`src/lib/emoji.ts`](src/lib/emoji.ts):
  - `emojiToCodepoint(emoji)` - converts emoji to hex codepoint
  - `getOpenMojiUrl(emoji)` - returns OpenMoji CDN URL
- Database still stores native emoji characters (no schema changes needed)

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
