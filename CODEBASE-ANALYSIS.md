# NowHere - Codebase Analysis & Technical Documentation

**Generated:** March 18, 2026  
**Status:** MVP Development (~75% Complete)  
**Version:** 0.1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Database Models](#database-models)
6. [API Endpoints](#api-endpoints)
7. [Application Architecture](#application-architecture)
8. [Current Limitations](#current-limitations)
9. [Development Status](#development-status)

---

## Executive Summary

**NowHere** is a location-based social events discovery application designed for frictionless event browsing and instant social connection. The app enables users to:

- Browse local events within ~1 mile radius without creating an account
- Join events with minimal friction (first name + last initial only)
- Instantly connect with other attendees via real-time chat
- Discover events through an interactive map or feed view
- Auto-expire events and chats after events end

**Key Differentiators:**

- Zero-friction anonymous browsing
- AI-powered venue email pipeline for event creation
- PostGIS-powered spatial queries for location-based discovery
- Real-time chat integration via Supabase Realtime

---

## Technology Stack

### Frontend Technologies

| Technology       | Purpose           | Version/Details       |
| ---------------- | ----------------- | --------------------- |
| **Next.js**      | React Framework   | v14.2.35 (App Router) |
| **React**        | UI Library        | v18                   |
| **TypeScript**   | Type Safety       | v5                    |
| **Tailwind CSS** | Styling Framework | v3.4.1                |
| **Mapbox GL JS** | Interactive Maps  | v3.20.0 (dark theme)  |
| **date-fns**     | Date Formatting   | v4.1.0                |

### Backend Technologies

| Technology          | Purpose              | Details                          |
| ------------------- | -------------------- | -------------------------------- |
| **Supabase**        | Backend-as-a-Service | Postgres + Auth + Realtime       |
| **PostGIS**         | Geospatial Database  | Extension for location queries   |
| **Together AI**     | AI Processing        | Llama 3.3 70B for email parsing  |
| **Vercel**          | Hosting & Deployment | Serverless functions + Cron jobs |
| **Resend/Postmark** | Email Webhooks       | Inbound email processing         |

### Development Tools

| Tool                      | Purpose                        |
| ------------------------- | ------------------------------ |
| **Foursquare Places API** | Venue data fetching (optional) |
| **ESLint**                | Code linting                   |
| **PostCSS**               | CSS processing                 |

---

## Functional Requirements

### ✅ Implemented Features (10/20)

#### FR-1: Location-Based Event Discovery

**Status:** ✅ Complete  
**Implementation:**

- PostGIS spatial queries within configurable radius (default 1600m, currently set to 5000m)
- Real-time distance calculation from user location
- Distance display in feet (<160m) or miles (≥160m)
- RPC function: `get_nearby_events(lat, lng, radius_m, filter_category, result_limit)`

#### FR-2: Category Filtering

**Status:** ✅ Complete  
**Categories:** music, food, art, sport, social, all  
**Implementation:**

- Category-based filtering in feed view
- Color-coded event cards and map markers by category
- Filter passed to PostGIS query for optimized performance

#### FR-3: Time-Based Organization

**Status:** ✅ Complete  
**Implementation:**

- Events split into "Nearby now" (starts ≤2 hours) and "Later tonight" (>2 hours)
- Time-relative event generation ensures data never goes stale
- Dynamic rendering based on `starts_at` timestamp

#### FR-4: Anonymous Browsing

**Status:** ✅ Complete  
**Implementation:**

- No authentication required for viewing events
- Public read policies on events, attendees, and messages tables
- Location permission is the only requirement

#### FR-5: Minimal Join Flow

**Status:** ✅ Complete
**Implementation:**

- Join triggered from ChatPanel's "I'm going! 🎉" button (below message input)
- Users can browse and send messages before committing to attend
- When user sends message without having joined:
  - Automatically joins event (creates `attendees` record)
  - Sends "I'm going! 🎉" system message
  - Then sends user's typed message
- Join modal requires only "First L." format (e.g., "Jamie K.") for anonymous users
- Regex validation: `/^[A-Z][a-z]+ [A-Z]\.$/`
- Creates attendee record with `user_id` for authenticated users or anonymous users (via Supabase signInAnonymously)
- Unique constraint `(event_id, user_id)` prevents duplicate joins
- **Requires:** Anonymous Auth enabled in Supabase Dashboard → Authentication → Providers

#### FR-6: Event-Based Chat

**Status:** ✅ Complete  
**Implementation:**

- Supabase Realtime subscriptions on `messages` table
- Real-time message broadcasting to all event attendees
- Chat panel in right sidebar (300px fixed width)
- Messages cascade delete when events expire

#### FR-7: Map View

**Status:** ✅ Complete  
**Implementation:**

- Mapbox GL JS with dark theme (`mapbox://styles/mapbox/dark-v11`)
- Custom circular markers with emoji icons
- Category-based color coding
- Marker anchor point: center
- Coordinates extracted via PostGIS `ST_X`/`ST_Y` functions

#### FR-8: Venue Email Pipeline

**Status:** ✅ Complete  
**Implementation:**

- Webhook endpoint: `POST /api/inbound-email`
- AI parsing with Llama 3.3 70B via Together AI
- Fallback parser for when API key is unavailable
- Email queue system with approval workflow
- Venue matching via email address

#### FR-9: Event Expiry

**Status:** ✅ Complete  
**Implementation:**

- Cron job runs hourly via Vercel (`vercel.json` config)
- Postgres function: `expire_events()`
- Events expire 2 hours after `ends_at` timestamp
- Cascade deletion of attendees and messages
- Status change: `live` → `expired`

#### FR-10: Distance Display

**Status:** ✅ Complete  
**Implementation:**

- Distance calculated by PostGIS `ST_Distance`
- Display logic: feet if <160m, miles if ≥160m
- Sorted by proximity (closest first)

### ⚠️ Partially Implemented Features (2/20)

#### FR-11: User Authentication

**Status:** ⚠️ Partial  
**Implementation:**

- Supabase Auth configured
- `AuthProvider` component exists in [`src/components/providers/SupabaseProvider.tsx`](src/components/providers/SupabaseProvider.tsx)
- Auth callback route exists at [`/api/auth/callback`](src/app/auth/callback/route.ts)
- **Missing:** Not wired into main layout, join flow doesn't require auth

#### FR-12: Email Approval Dashboard

**Status:** ⚠️ Partial  
**Implementation:**

- VenuePanel displays pending emails
- Approve endpoint works: `POST /api/email-queue/[id]/approve`
- **Missing:** Edit functionality, Reject endpoint (route exists but not functional)

### ❌ Not Implemented Features (8/20)

| Feature                       | Status     | Notes                                           |
| ----------------------------- | ---------- | ----------------------------------------------- |
| **FR-13: My Events Page**     | ❌ Missing | Route exists but shows placeholder UI           |
| **FR-14: Chats Page**         | ❌ Missing | Route exists but shows placeholder UI           |
| **FR-15: Settings Page**      | ❌ Missing | Route exists but shows placeholder UI           |
| **FR-16: Event CRUD API**     | ❌ Missing | No direct API for manual event creation/editing |
| **FR-17: Venue Stats API**    | ❌ Missing | Specified but not implemented                   |
| **FR-18: "Right Now" Filter** | ❌ Missing | Button rendered but non-functional              |
| **FR-19: "Free Only" Filter** | ❌ Missing | Button rendered but non-functional              |
| **FR-20: Mobile App**         | ❌ Missing | React Native/Expo not started                   |

---

## Non-Functional Requirements

### Performance (3/3) ✅

| Requirement                         | Status      | Implementation                                                      |
| ----------------------------------- | ----------- | ------------------------------------------------------------------- |
| **NFR-1: Fast Spatial Queries**     | ✅ Complete | PostGIS GIST index on `events.location`                             |
| **NFR-2: Real-Time Updates**        | ✅ Complete | Supabase Realtime on `messages`, `events`, `attendees`              |
| **NFR-3: Efficient Event Fetching** | ✅ Complete | Single RPC call returns all data (distance, attendee count, coords) |

### Security (5/5) ✅

| Requirement                         | Status      | Implementation                                                  |
| ----------------------------------- | ----------- | --------------------------------------------------------------- |
| **NFR-4: Row-Level Security**       | ✅ Complete | RLS enabled on all tables                                       |
| **NFR-5: Anonymous Access Control** | ✅ Complete | Public read for live events, insert-only for attendees/messages |
| **NFR-6: Email Queue Protection**   | ✅ Complete | Service role only access                                        |
| **NFR-7: Dev Endpoint Protection**  | ✅ Complete | Checks `NODE_ENV !== 'production'`                              |
| **NFR-8: Cron Authentication**      | ✅ Complete | Verifies `CRON_SECRET` header                                   |

### Scalability (3/3) ✅

| Requirement                        | Status      | Implementation                 |
| ---------------------------------- | ----------- | ------------------------------ |
| **NFR-9: Serverless Architecture** | ✅ Complete | Next.js App Router + Vercel    |
| **NFR-10: Database Scaling**       | ✅ Complete | Supabase Postgres with PostGIS |
| **NFR-11: Cron Job Scheduling**    | ✅ Complete | Vercel Cron (hourly)           |

### Maintainability (4/4) ✅

| Requirement                  | Status      | Implementation                                                          |
| ---------------------------- | ----------- | ----------------------------------------------------------------------- |
| **NFR-12: TypeScript Types** | ✅ Complete | Full database types in [`src/types/database.ts`](src/types/database.ts) |
| **NFR-13: Migration System** | ✅ Complete | Supabase migrations directory                                           |
| **NFR-14: Seed Data**        | ✅ Complete | SQL seed + dev seeder API                                               |
| **NFR-15: Documentation**    | ✅ Complete | CONTEXT.MD, TESTING.MD, APP-SUMMARY.MD                                  |

---

## Database Models

### Schema Overview

The database uses **PostgreSQL with PostGIS extension** for geospatial capabilities.

### Tables

#### 1. `venues`

Registered venues/organizers that can post events.

```sql
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,       -- used for inbound email matching
  address text,
  location geography(point, 4326),  -- PostGIS point (WGS84)
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
```

**Indexes:** Primary key only
**RLS Policies:** Public read-only
**Relationships:** Referenced by `events.venue_id` and `email_queue.matched_venue_id`

**Enriched Fields (added March 2026):**

- `description` - Human-readable venue description
- `hours` - Operating hours string
- `phone` - Contact phone number
- `website` - Venue website URL
- `rating` - Aggregate rating (0.0-5.0)

#### 2. `events`

Core events table with location and metadata.

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  title text not null,
  description text,
  emoji text default '📍',
  category text,                    -- 'music' | 'food' | 'art' | 'sport' | 'social'
  tags text[],                      -- descriptive tags
  starts_at timestamptz not null,
  ends_at timestamptz,
  price_label text default 'Free',  -- 'Free' | '$' | '$$' | '$15' etc
  location geography(point, 4326),  -- PostGIS point
  address text,
  status text default 'pending',    -- 'pending' | 'live' | 'expired'
  source text default 'email',      -- 'email' | 'manual' | 'scraped'
  raw_email_id uuid references email_queue(id),
  created_at timestamptz default now()
);
```

**Indexes:**

- `events_location_idx` - GIST index for spatial queries
- `events_status_idx` - B-tree index on status
- `events_starts_at_idx` - B-tree index on start time

**RLS Policies:**

- Public read for `live` and `pending` events
- Service role can insert/update

**Realtime:** Enabled for live status updates

#### 3. `email_queue`

Inbound email processing queue with AI parsing results.

```sql
create table email_queue (
  id uuid primary key default gen_random_uuid(),
  from_address text not null,
  subject text,
  body_text text,
  body_html text,
  parsed_data jsonb,                -- AI extraction result
  matched_venue_id uuid references venues(id),
  status text default 'pending',    -- 'pending' | 'approved' | 'rejected'
  received_at timestamptz default now()
);
```

**Indexes:** Primary key only  
**RLS Policies:** Service role only  
**Relationships:** Referenced by `events.raw_email_id`

**Parsed Data Schema (JSONB):**

```typescript
{
  title: string
  description: string      // max 120 chars
  emoji: string           // single emoji
  category: string        // music | food | art | sport | social
  tags: string[]          // up to 5 tags
  starts_at: string | null // ISO 8601
  ends_at: string | null   // ISO 8601
  price_label: string
  address: string | null
  confidence: number      // 0-1
}
```

#### 4. `attendees`

Event participants (anonymous or authenticated).

```sql
create table attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,                -- "First L." format
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);
```

**Indexes:** `attendees_event_idx` on `event_id`  
**RLS Policies:**

- Public read
- Public insert (anyone can join)

**Realtime:** Enabled for attendee count updates  
**Constraints:** Unique on `(event_id, user_id)` prevents duplicate joins

#### 5. `messages`

Chat messages tied to events (cascade delete).

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  attendee_id uuid references attendees(id) on delete cascade,
  display_name text,
  body text not null,
  created_at timestamptz default now()
);
```

**Indexes:** `messages_event_idx` on `event_id`  
**RLS Policies:**

- Public read
- Public insert (attendees can send messages)

**Realtime:** Enabled for live chat updates

### Database Functions

#### `expire_events()`

Automatically expires events 2 hours after they end.

```sql
create or replace function expire_events() returns void as $$
  update events
  set status = 'expired'
  where ends_at < now() - interval '2 hours'
  and status = 'live';
$$ language sql;
```

**Trigger:** Called hourly by Vercel cron job  
**Effect:** Status change cascades to delete attendees and messages

#### `get_nearby_events()`

Returns events within radius with distance calculations.

```sql
create or replace function get_nearby_events(
  lat float,
  lng float,
  radius_m float default 1600,
  filter_category text default null,
  result_limit int default 50
) returns table (...)
```

**Returns:**

- All event fields
- `distance_m` - Distance from user in meters (calculated)
- `attendee_count` - Number of attendees (aggregated)
- `location_lat`, `location_lng` - Extracted coordinates for map markers

**Performance:** Uses spatial index for fast queries

### ER Diagram (Text)

```
venues (1) ──< (M) events ──< (M) attendees
   │                │              │
   │                └──< (M) messages
   │
   └──< (M) email_queue ──< (1) events
                              (via raw_email_id)
```

### TypeScript Types

Full database types are defined in [`src/types/database.ts`](src/types/database.ts):

```typescript
export type Venue = Database["public"]["Tables"]["venues"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EmailQueue = Database["public"]["Tables"]["email_queue"]["Row"];
export type Attendee = Database["public"]["Tables"]["attendees"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
```

---

## API Endpoints

### Public Endpoints

#### GET `/api/venues/[id]`

Get detailed information about a specific venue.

**Path Parameters:**

- `id` (required) - Venue UUID

**Response:**

```typescript
{
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  vibe_tags: string[] | null;
  description: string | null;
  hours: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  activeEvents: number;  // Count of live events at this venue
}
```

**Implementation:** [`src/app/api/venues/[id]/route.ts`](src/app/api/venues/[id]/route.ts)

#### GET `/api/events/nearby`

Get events within radius of coordinates.

**Query Parameters:**

- `lat` (required) - Latitude
- `lng` (required) - Longitude
- `radius_m` (optional, default: 1600) - Search radius in meters
- `category` (optional) - Filter by category
- `limit` (optional, default: 50) - Max results

**Response:**

```typescript
{
  events: NearbyEvent[]  // Events with distance, attendee_count, venue_name, coords
  query: { lat, lng, radius_m, category }
  count: number
}
```

**Implementation:** [`src/app/api/events/nearby/route.ts`](src/app/api/events/nearby/route.ts)

#### POST `/api/events/[id]/join`

Join an event and get chat access.

**Request Body:**

```typescript
{
  displayName: string; // "First L." format, e.g., "Jamie K."
}
```

**Response:**

```typescript
{
  attendee_id: string;
  chat_channel: string; // "event-{eventId}"
  message: string;
}
```

**Validation:**

- Display name regex: `/^[A-Z][a-z]+ [A-Z]\.$/`
- Event must be `live` status
- Prevents duplicate joins (unique constraint)

**Implementation:** [`src/app/api/events/[id]/join/route.ts`](src/app/api/events/[id]/join/route.ts)

### Webhook Endpoints

#### POST `/api/inbound-email`

Webhook for inbound venue emails (Resend/Postmark).

**Request Body:**

```typescript
{
  from: string
  to: string
  subject: string
  text?: string
  html?: string
}
```

**Process:**

1. Match `from` address to verified venue
2. Parse email with Llama 3.3 70B AI (or fallback parser)
3. Insert to `email_queue` with `parsed_data`
4. Return queue ID and parsing results

**Response:**

```typescript
{
  success: boolean;
  id: string;
  matched_venue: boolean;
  parsed_data: ParsedEventData;
}
```

**Implementation:** [`src/app/api/inbound-email/route.ts`](src/app/api/inbound-email/route.ts)

**AI Parsing:** Uses Together AI with Llama 3.3 70B Instruct Turbo model

#### POST `/api/email-queue/[id]/approve`

Approve parsed email and create live event.

**Authentication:** Requires service role key

**Response:**

```typescript
{
  success: boolean;
  event_id: string;
  message: string;
}
```

**Implementation:** [`src/app/api/email-queue/[id]/approve/route.ts`](src/app/api/email-queue/[id]/approve/route.ts)

#### POST `/api/email-queue/[id]/reject`

Reject parsed email (endpoint exists but not functional).

**Status:** ⚠️ Route exists but logic not implemented

**Implementation:** [`src/app/api/email-queue/[id]/reject/route.ts`](src/app/api/email-queue/[id]/reject/route.ts)

### Cron Endpoints

#### GET `/api/cron/expire-events`

Vercel cron job to expire old events (runs hourly).

**Authentication:** Bearer token from `CRON_SECRET` env var

**Schedule:** `0 * * * *` (hourly, configured in [`vercel.json`](vercel.json))

**Response:**

```typescript
{
  success: boolean
  message: string
  expired_count?: number
}
```

**Implementation:** [`src/app/api/cron/expire-events/route.ts`](src/app/api/cron/expire-events/route.ts)

### Development Endpoints

#### POST `/api/dev/seed`

Generate realistic events at nearby venues (dev only).

**Security:** Returns 403 when `NODE_ENV === 'production'`

**Query Parameters:**

- `lat` (required) - Latitude
- `lng` (required) - Longitude
- `radius_m` (optional, default: 1600) - Search radius
- `count` (optional, default: 10) - Number of events to generate
- `source` (optional, default: 'foursquare') - 'foursquare' or 'static'

**Data Sources:**

1. **Foursquare Places API** - Fetches real venues (requires `FOURSQUARE_API_KEY`)
2. **Static Fallback** - 40 curated NYC venues from [`src/data/seed-venues.json`](src/data/seed-venues.json)

**Event Generation:**

- Time-relative timestamps (30% started, 40% starting soon, 30% later tonight)
- Realistic attendees (0-15 based on timing)
- Chat messages for events with 3+ attendees

**Response:**

```typescript
{
  venues_created: number;
  events_created: number;
  attendees_created: number;
  messages_created: number;
}
```

**Implementation:** [`src/app/api/dev/seed/route.ts`](src/app/api/dev/seed/route.ts)

#### POST `/api/dev/reset`

Delete all seeded events and venues (dev only).

**Security:** Returns 403 in production

**Response:**

```typescript
{
  events_deleted: number;
  venues_deleted: number;
}
```

**Implementation:** [`src/app/api/dev/reset/route.ts`](src/app/api/dev/reset/route.ts)

### Auth Endpoints

#### GET `/api/auth/callback`

OAuth callback handler for Supabase Auth.

**Purpose:** Handles magic link and OAuth redirects

**Implementation:** [`src/app/auth/callback/route.ts`](src/app/auth/callback/route.ts)

---

## Application Architecture

### Frontend Architecture

#### Page Structure

```
src/app/
├── page.tsx              # Main feed view (hero + grid)
├── map/page.tsx          # Map view with Mapbox
├── my-events/page.tsx    # User's joined events (placeholder)
├── chats/page.tsx        # Chat aggregation (placeholder)
├── settings/page.tsx     # User settings (placeholder)
└── auth/
    ├── callback/route.ts # Auth callback handler
    └── error/page.tsx    # Auth error page
```

#### Component Structure

```
src/components/
├── auth/
│   └── AuthModal.tsx          # Login/signup modal
├── chat/
│   └── ChatPanel.tsx          # Real-time chat UI
├── events/
│   ├── EventCard.tsx          # Event card component
│   ├── VenuePanel.tsx         # Email queue approval UI
│   └── VenueDetailPanel.tsx   # Venue detail side panel (fetches from API)
├── layout/
│   ├── Sidebar.tsx            # Left navigation (68px)
│   └── RightPanel.tsx         # Chat + venues (300px)
├── providers/
│   └── SupabaseProvider.tsx   # Auth context provider
└── ui/
    └── Emoji.tsx               # Emoji rendering component
```

#### Layout System

**Three-Column Layout:**

1. **Sidebar** (68px fixed) - Vertical navigation
2. **Main Content** (flexible) - Feed/map with scroll
3. **Right Panel** (300px fixed) - Chat + venue email queue

**Responsive Behavior:**

- Desktop (lg+): All three columns visible
- Mobile: Right panel hidden (`hidden lg:flex`), sidebar collapsed

#### State Management

**No external state management library** - Uses React hooks:

- `useState` for local component state
- `useEffect` for side effects and subscriptions
- Supabase client handles global auth state

#### Real-Time Subscriptions

**Supabase Realtime** for live updates:

```typescript
// Messages subscription (ChatPanel)
supabase
  .channel(`event-${eventId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `event_id=eq.${eventId}`,
    },
    (payload) => {
      // Add new message to state
    },
  )
  .subscribe();

// Events subscription
supabase
  .channel("events")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "events",
    },
    () => {
      // Refresh event list
    },
  )
  .subscribe();

// Attendees subscription
supabase
  .channel("attendees")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "attendees",
    },
    () => {
      // Update attendee counts
    },
  )
  .subscribe();
```

### Backend Architecture

#### API Route Handlers (Next.js 14)

All API routes use Next.js Route Handlers (App Router pattern):

```typescript
// route.ts files export HTTP method handlers
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
```

#### Supabase Client Types

**Client-side:** [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts)

- Browser-based client
- Uses anonymous key
- Respects RLS policies

**Server-side:** [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts)

- Two client types:
  1. `createClient()` - Regular server client (respects RLS)
  2. `createServiceClient()` - Service role client (bypasses RLS)

#### Database Access Patterns

1. **Spatial Queries** - Via `get_nearby_events()` RPC function
2. **Direct Table Access** - Via Supabase client `.from()` methods
3. **Realtime Subscriptions** - Via `.channel().on()` pattern

### Design System

#### Color Palette

**Defined in:** [`tailwind.config.ts`](tailwind.config.ts)

**Background Colors:**

- `bg`: `#0a0a0b` - Primary background
- `surface`: `#111113` - Elevated surfaces
- `surface2`: `#18181c` - Higher elevation

**Text Colors:**

- `text`: `#f0efe8` - Primary text
- `muted`: `#888784` - Secondary text
- `faint`: `#3a3a3e` - Tertiary text

**Accent Colors:**

- `purple`: `#7b6ef6` - Primary accent
- `green`: `#3ecf8e` - Success/music
- `amber`: `#f5a623` - Food category
- `coral`: `#f06449` - Alert/sport
- `blue`: `#4f9cf9` - Info

**Category Colors:**

- Music: Green
- Food: Amber
- Art: Purple
- Sport: Coral
- Social: Blue

#### Typography

**Fonts:**

- **Display (Headings):** Syne
- **Body (Content):** DM Sans

**Font Files:** [`src/app/fonts/`](src/app/fonts/)

- GeistVF.woff
- GeistMonoVF.woff

#### Border Radius

- Default: 16px
- Small: 10px

### Data Flow Diagrams

#### Event Discovery Flow

```
User → Browser Geolocation API
  ↓
[lat, lng] → GET /api/events/nearby?lat={lat}&lng={lng}&radius_m=5000
  ↓
Supabase RPC → get_nearby_events(lat, lng, radius_m, category, limit)
  ↓
PostGIS Query → ST_Distance calculation + ST_DWithin filter
  ↓
Return events[] with distance_m, attendee_count, location_lat/lng
  ↓
Frontend renders:
  - Feed: Hero card (closest) + Grid cards (sorted by distance)
  - Map: Mapbox markers with emoji + category color
```

#### Join Event Flow

```
User clicks "I'm going" → JoinModal opens
  ↓
User enters "First L." format name
  ↓
POST /api/events/{id}/join with { displayName }
  ↓
Validate format: /^[A-Z][a-z]+ [A-Z]\.$/
  ↓
Check event status === 'live'
  ↓
INSERT into attendees (event_id, user_id, display_name)
  ↓
Return { attendee_id, chat_channel: "event-{id}" }
  ↓
Frontend:
  - Subscribe to Supabase Realtime channel
  - Show ChatPanel in right sidebar
  - Enable message sending
```

#### Email Pipeline Flow

```
Venue sends email to events@nowhere.app
  ↓
Email provider (Resend/Postmark) webhook
  ↓
POST /api/inbound-email with { from, subject, text, html }
  ↓
Match from_address to venues.email
  ↓
Parse email:
  - If TOGETHER_AI_API_KEY exists:
    → Call Together AI API (Llama 3.3 70B)
    → Extract structured event data
  - Else:
    → Fallback keyword-based parser
  ↓
INSERT into email_queue:
  - from_address, subject, body_text, body_html
  - parsed_data (JSONB)
  - matched_venue_id (if found)
  - status: 'pending'
  ↓
Admin reviews in VenuePanel
  ↓
POST /api/email-queue/{id}/approve
  ↓
INSERT into events:
  - venue_id, title, description, emoji, category
  - tags, starts_at, ends_at, price_label
  - location (from venue), address
  - status: 'live'
  - raw_email_id
  ↓
Event appears in feed and map
```

#### Chat Message Flow

```
User types message in ChatPanel
  ↓
Client-side: supabase.from('messages').insert({
  event_id,
  attendee_id,
  display_name,
  body
})
  ↓
Supabase inserts message to database
  ↓
Supabase Realtime broadcasts INSERT event
  ↓
All subscribers receive via postgres_changes:
  channel: "event-{eventId}"
  event: 'INSERT'
  table: 'messages'
  ↓
All ChatPanel instances receive new message
  ↓
Message rendered in real-time
```

#### Event Expiry Flow

```
Vercel Cron scheduler (hourly: 0 * * * *)
  ↓
GET /api/cron/expire-events
  ↓
Verify Bearer token === CRON_SECRET
  ↓
Call Supabase RPC: expire_events()
  ↓
SQL: UPDATE events SET status='expired'
     WHERE ends_at < now() - interval '2 hours'
     AND status = 'live'
  ↓
Cascade DELETE:
  - attendees where event_id = expired_event_id
  - messages where event_id = expired_event_id
  ↓
Return { expired_count }
  ↓
Expired events no longer appear in get_nearby_events results
```

#### Venue Detail Flow

```
User clicks venue name on EventCard
 ↓
onVenueClick(venueId) called
 ↓
setSelectedVenueId(venueId) - updates state
 ↓
VenueDetailPanel receives venueId prop
 ↓
useEffect triggers fetchVenue()
 ↓
GET /api/venues/{venueId}
 ↓
Supabase query:
 - SELECT * from venues WHERE id = venueId
 - Parse PostGIS location to lat/lng
 - COUNT active events at venue
 ↓
Return venue details:
 {
   id, name, address, lat, lng,
   category, vibe_tags,
   description, hours, phone, website, rating,
   activeEvents
 }
 ↓
VenueDetailPanel renders:
 - Header with name, category, rating
 - Description
 - Hours, phone, website (if available)
 - Vibe tags
 - Active events count
 - Map link
 ↓
User can click "View on Map" to open directions
 ↓
Close button clears selectedVenueId state
```

---

## Current Limitations

### Missing Features

1. **No Direct Event Management** - Events can only be created via:
   - Email pipeline (venues send emails)
   - Dev seeder API (development only)
   - No manual event creation UI or API

2. **Incomplete Pages** - Routes exist but show placeholder UI:
   - `/my-events` - Should show user's joined events
   - `/chats` - Should aggregate all active chats
   - `/settings` - Should show user preferences

3. **Authentication Not Integrated**
   - `AuthProvider` exists but not used in main layout
   - Join flow works without authentication
   - No logged-in user state management

4. **Non-Functional Filters**
   - "Right now" button rendered but doesn't filter
   - "Free only" button rendered but doesn't filter

5. **Email Rejection** - Reject endpoint exists but not functional

6. **Venue Stats** - No API endpoint for venue statistics

7. **Mobile App** - React Native/Expo mentioned but not started

8. **Mobile Chat Access** - Right panel hidden on mobile, no way to access chat on small screens

### Known Issues

1. **Map Marker Performance** - Markers recreated on every event list change (could optimize with memoization)

2. **Limited Error Handling** - Minimal error states beyond basic loading spinners

3. **Auth Error Page Missing** - Redirects to `/auth/error` which doesn't exist (shows 404)

4. **Duplicate Join Feedback** - Prevented by DB unique constraint but no UI feedback when user tries to join twice

5. **No Offline Support** - Requires active internet connection

6. **No Event Validation** - Events can be created with invalid dates or locations

### Security Considerations

**Addressed:**

- ✅ RLS policies on all tables
- ✅ Service role protection on sensitive endpoints
- ✅ Dev endpoints disabled in production
- ✅ Cron endpoint authentication

**Not Addressed:**

- ⚠️ No rate limiting on API endpoints
- ⚠️ No input sanitization for email parsing
- ⚠️ No spam prevention for chat messages
- ⚠️ No abuse reporting mechanism

### Performance Considerations

**Optimized:**

- ✅ PostGIS spatial indexing
- ✅ Single RPC call for event fetching
- ✅ Efficient real-time subscriptions

**Not Optimized:**

- ⚠️ No pagination for events (fixed limit of 50)
- ⚠️ No caching layer
- ⚠️ No image optimization
- ⚠️ Map markers recreated on every render

---

## Development Status

### Completion Metrics

**Overall Progress:** ~75% Complete

**By Category:**

- Functional Requirements: 50% (10/20 complete, 2 partial)
- Non-Functional Requirements: 100% (15/15 complete)
- Core Features: 90% (all core flows working)
- UI/UX: 70% (main views complete, settings pages missing)
- Integration: 60% (auth not wired, filters not functional)

### Testing Status

**✅ Tested & Working:**

- Event discovery by location
- Category filtering
- Distance calculation
- Map markers with real coordinates
- Join modal and validation
- Real-time chat (send/receive)
- Attendee count updates
- Email parsing (AI + fallback)
- Event expiry cron
- Dev seeder (static venues)
- Venue email matching

**⚠️ Needs Testing:**

- Foursquare API integration (requires API key)
- Magic link authentication
- Email webhook from production email provider
- Production deployment and scaling
- Mobile responsive behavior
- Error recovery and edge cases

**❌ Not Testable Yet:**

- My Events page functionality
- Chats page aggregation
- Settings page
- Email rejection flow
- Venue stats endpoint
- Mobile app

### Priority Roadmap

#### High Priority (MVP Completion)

1. Wire up authentication throughout app
2. Build `/my-events`, `/chats`, `/settings` pages
3. Implement event CRUD API
4. Add email rejection flow
5. Fix filter buttons ("Right now", "Free only")
6. Mobile responsive improvements (especially chat access)

#### Medium Priority (Enhanced Features)

1. Event search and text filtering
2. User profiles (optional)
3. Event recommendations/favorites
4. Push notifications for joined events
5. Photo uploads for events
6. Event check-in verification

#### Low Priority (Nice to Have)

1. React Native mobile app
2. Event analytics dashboard
3. Venue admin portal
4. Social sharing
5. Event reminders
6. Multiple cities support

---

## Environment Configuration

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=         # Mapbox public token

# AI (Optional)
TOGETHER_AI_API_KEY=              # Together AI for email parsing

# Email (Optional)
RESEND_API_KEY=                   # Resend for email webhooks
# OR
POSTMARK_API_KEY=                 # Postmark for email webhooks

# Development (Optional)
FOURSQUARE_API_KEY=               # Foursquare Places API for dev seeder

# Cron Authentication
CRON_SECRET=                      # Secret for cron endpoint authentication

# App Configuration
NEXT_PUBLIC_APP_URL=              # App URL for OAuth callbacks
```

### Deployment Configuration

**Platform:** Vercel

**Cron Configuration** ([`vercel.json`](vercel.json)):

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-events",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Build Command:** `npm run build`  
**Output Directory:** `.next`  
**Node Version:** 20.x (recommended)

---

## File Structure Overview

```
nowhere-app/
├── .next/                          # Build output
├── public/
│   └── manifest.json               # PWA manifest
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # API routes
│   │   │   ├── auth/
│   │   │   │   └── callback/       # OAuth callback
│   │   │   ├── cron/
│   │   │   │   └── expire-events/  # Hourly cron job
│   │   │   ├── dev/
│   │   │   │   ├── seed/           # Dev seeder
│   │   │   │   └── reset/          # Reset seeded data
│   │   │   ├── email-queue/
│   │   │   │   └── [id]/
│   │   │   │       ├── approve/    # Approve email
│   │   │   │       └── reject/     # Reject email (stub)
│   │   │   ├── events/
│   │   │   │   ├── [id]/join/      # Join event
│   │   │   │   ├── my-attendances/ # Get user's joined events
│   │   │   │   └── nearby/         # Get nearby events
│   │   │   ├── venues/
│   │   │   │   └── [id]/           # Get venue details
│   │   │   └── inbound-email/      # Email webhook
│   │   ├── auth/
│   │   │   ├── callback/           # Auth callback route
│   │   │   └── error/              # Auth error page
│   │   ├── chats/                  # Chats page (placeholder)
│   │   ├── fonts/                  # Font files
│   │   ├── map/                    # Map view page
│   │   ├── my-events/              # My events page (placeholder)
│   │   ├── settings/               # Settings page (placeholder)
│   │   ├── favicon.ico
│   │   ├── globals.css             # Global styles + Mapbox CSS
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Main feed page
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthModal.tsx       # Login/signup modal
│   │   ├── chat/
│   │   │   └── ChatPanel.tsx       # Real-time chat UI
│   │   ├── events/
│   │   │   ├── EventCard.tsx       # Event card component
│   │   │   ├── VenueDetailPanel.tsx # Venue detail side panel
│   │   │   └── VenuePanel.tsx      # Email approval UI
│   │   ├── layout/
│   │   │   ├── RightPanel.tsx      # Right sidebar
│   │   │   └── Sidebar.tsx         # Left navigation
│   │   └── providers/
│   │       └── SupabaseProvider.tsx # Auth provider
│   ├── data/
│   │   ├── mock-venue-details.ts   # Mock venue detail types (deprecated)
│   │   └── seed-venues.json        # Static venue data (30+ NYC venues with enriched fields)
│   ├── lib/
│   │   ├── event-generator.ts      # Event generation utilities
│   │   ├── foursquare.ts           # Foursquare API client
│   │   └── supabase/
│   │       ├── client.ts           # Browser Supabase client
│   │       └── server.ts           # Server Supabase client
│   ├── types/
│   │   └── database.ts             # TypeScript database types
│   └── middleware.ts               # Next.js middleware
├── supabase/
│   ├── migrations/
│   │   ├── 20260317124752_initial_schema.sql
│   │   ├── 20260317190000_add_coords_to_nearby_events.sql
│   │   └── 20260320170000_add_venue_details.sql
│   ├── schema.sql                  # Complete schema
│   └── seed.sql                    # Seed data (8 events, 6 venues)
├── .env.local.example              # Environment variables template
├── .eslintrc.json                  # ESLint config
├── .gitignore
├── APP-SUMMARY.md                  # Application summary
├── CONTEXT.MD                      # AI coding assistant rules
├── next.config.mjs                 # Next.js config
├── package.json
├── postcss.config.mjs              # PostCSS config
├── README.md                       # Project README
├── tailwind.config.ts              # Tailwind config
├── TESTING.md                      # Testing guide
├── tsconfig.json                   # TypeScript config
└── vercel.json                     # Vercel deployment config
```

**Total Files:** ~50  
**Estimated Lines of Code:** ~3,500

---

## Key Learnings & Best Practices

### PostGIS Integration

**Key Points:**

- Use `geography(point, 4326)` for accurate distance calculations
- GIST indexes are essential for spatial query performance
- `ST_DWithin` is faster than `ST_Distance` + WHERE clause
- Extract coordinates with `ST_X(geometry)` and `ST_Y(geometry)`

### Supabase Realtime

**Key Points:**

- Subscribe to specific channels to avoid unnecessary broadcasts
- Use `postgres_changes` for table-level subscriptions
- Filter subscriptions at the database level when possible
- Unsubscribe when components unmount to prevent memory leaks

### Mapbox Integration

**Key Points:**

- Import Mapbox CSS via npm package, not CDN
- Set explicit `anchor` property on custom markers
- Avoid hover animations that cause position shifts
- Use `pointer-events` carefully to prevent event conflicts

### Next.js App Router

**Key Points:**

- Use `'use client'` directive only when necessary
- Server Components by default for better performance
- Dynamic route parameters are now Promises in Next.js 14
- Use Route Handlers (`route.ts`) for API endpoints

### Security

**Key Points:**

- Enable RLS on all Supabase tables
- Use service role client only when necessary
- Validate all user inputs on the server
- Disable dev endpoints in production
- Authenticate cron endpoints with secrets

---

**End of Document**

_For more information, see:_

- [CONTEXT.MD](CONTEXT.MD) - AI coding assistant rules
- [APP-SUMMARY.md](APP-SUMMARY.md) - Detailed application summary
- [TESTING.md](TESTING.md) - Testing procedures
- [README.md](README.md) - Quick start guide
