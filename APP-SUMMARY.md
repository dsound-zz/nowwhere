# NowHere - Application Summary

## Overview

NowHere is a frictionless local events discovery app that shows users what's happening within ~1 mile of their current location. The app emphasizes zero-friction browsing and instant social connection through event-based chat rooms.

**Core Concept:** Browse events without an account, join with just your name, instantly connect with other attendees via live chat.

---

## Functional Requirements

### ✅ Implemented

| Requirement                              | Status      | Implementation                                                                                   |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| **FR-1: Location-Based Event Discovery** | ✅ Complete | Users can view events within a configurable radius (default 1600m) using PostGIS spatial queries |
| **FR-2: Category Filtering**             | ✅ Complete | Events filterable by: music, food, art, sport, social, or all                                    |
| **FR-3: Time-Based Organization**        | ✅ Complete | Feed splits events into "Nearby now" (≤2 hours) and "Later tonight" (>2 hours)                   |
| **FR-4: Anonymous Browsing**             | ✅ Complete | No account required to view events feed or map                                                   |
| **FR-5: Minimal Join Flow**              | ✅ Complete | Join events with first name + last initial only (e.g., "Jamie K.")                               |
| **FR-6: Event-Based Chat**               | ✅ Complete | Real-time chat via Supabase Realtime for joined events                                           |
| **FR-7: Map View**                       | ✅ Complete | Mapbox GL JS map showing event markers with category colors                                      |
| **FR-8: Venue Email Pipeline**           | ✅ Complete | Venues email events → AI parsing → approval queue → published                                    |
| **FR-9: Event Expiry**                   | ✅ Complete | Cron job expires events 2 hours after end time, cascades to messages/attendees                   |
| **FR-10: Distance Display**              | ✅ Complete | Events show distance in feet (<160m) or miles (≥160m)                                            |

### ⚠️ Partially Implemented

| Requirement                         | Status     | Notes                                                                                          |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| **FR-11: User Authentication**      | ⚠️ Partial | AuthProvider exists but not wired into layout. Join flow doesn't require auth.                 |
| **FR-12: Email Approval Dashboard** | ⚠️ Partial | VenuePanel shows pending emails with "Approve" button. "Edit" and "Reject" are non-functional. |

### ❌ Not Implemented

| Requirement                   | Status     | Notes                                                                        |
| ----------------------------- | ---------- | ---------------------------------------------------------------------------- |
| **FR-13: My Events Page**     | ❌ Missing | `/my-events` route doesn't exist (linked from Sidebar)                       |
| **FR-14: Chats Page**         | ❌ Missing | `/chats` route doesn't exist (linked from Sidebar)                           |
| **FR-15: Settings Page**      | ❌ Missing | `/settings` route doesn't exist (linked from Sidebar)                        |
| **FR-16: Event CRUD via API** | ❌ Missing | No direct API to create/edit/delete events (only via email pipeline or seed) |
| **FR-17: Venue Stats API**    | ❌ Missing | `/api/venue/[id]/stats` specified in prompt but not implemented              |
| **FR-18: "Right Now" Filter** | ❌ Missing | Button rendered but non-functional                                           |
| **FR-19: "Free Only" Filter** | ❌ Missing | Button rendered but non-functional                                           |
| **FR-20: Mobile App**         | ❌ Missing | React Native/Expo not started                                                |

---

## Non-Functional Requirements

### Performance

| Requirement                         | Status      | Implementation                                                                                |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| **NFR-1: Fast Spatial Queries**     | ✅ Complete | PostGIS GIST index on `events.location`                                                       |
| **NFR-2: Real-Time Updates**        | ✅ Complete | Supabase Realtime subscriptions on `messages`, `events`, `attendees` tables                   |
| **NFR-3: Efficient Event Fetching** | ✅ Complete | Single RPC call `get_nearby_events` returns events with distance, attendee count, coordinates |

### Security

| Requirement                         | Status      | Implementation                                                  |
| ----------------------------------- | ----------- | --------------------------------------------------------------- |
| **NFR-4: Row-Level Security**       | ✅ Complete | RLS enabled on all tables with appropriate policies             |
| **NFR-5: Anonymous Access Control** | ✅ Complete | Public read for live events, insert-only for attendees/messages |
| **NFR-6: Email Queue Protection**   | ✅ Complete | Service role only access to `email_queue`                       |
| **NFR-7: Dev Endpoint Protection**  | ✅ Complete | `/api/dev/*` only works when `NODE_ENV !== 'production'`        |
| **NFR-8: Cron Authentication**      | ✅ Complete | Expire events endpoint checks `CRON_SECRET` header              |

### Scalability

| Requirement                        | Status      | Notes                                                 |
| ---------------------------------- | ----------- | ----------------------------------------------------- |
| **NFR-9: Serverless Architecture** | ✅ Complete | Next.js App Router + Vercel deployment                |
| **NFR-10: Database Scaling**       | ✅ Complete | Supabase Postgres with PostGIS, horizontally scalable |
| **NFR-11: Cron Job Scheduling**    | ✅ Complete | Vercel Cron configured in `vercel.json` (hourly)      |

### Maintainability

| Requirement                  | Status      | Implementation                                 |
| ---------------------------- | ----------- | ---------------------------------------------- |
| **NFR-12: TypeScript Types** | ✅ Complete | Full database types in `src/types/database.ts` |
| **NFR-13: Migration System** | ✅ Complete | Supabase migrations in `supabase/migrations/`  |
| **NFR-14: Seed Data**        | ✅ Complete | `supabase/seed.sql` + dev seeder API           |
| **NFR-15: Documentation**    | ✅ Complete | CONTEXT.MD, TESTING.MD, inline comments        |

---

## Core Elements

### Technology Stack

**Frontend:**

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS with custom design system
- **Maps:** Mapbox GL JS (dark theme)
- **State:** React hooks (no external state management)

**Backend:**

- **Database:** Supabase (Postgres + PostGIS)
- **Auth:** Supabase Auth (configured but not fully integrated)
- **Realtime:** Supabase Realtime (postgres_changes)
- **Email:** Resend/Postmark webhooks (for inbound emails)
- **AI:** Together AI (Llama 3.3 70B) for email parsing

**Infrastructure:**

- **Deployment:** Vercel (web app + cron)
- **API Routes:** Next.js Route Handlers
- **Dev Tools:** Foursquare Places API (optional)

### Database Schema

**Tables:**

1. **venues** - Registered venues/organizers
   - Fields: `id`, `name`, `email`, `address`, `location` (PostGIS), `category`, `vibe_tags`, `verified`
   - Index: None specifically (primary key only)

2. **events** - Events with location and metadata
   - Fields: `id`, `venue_id`, `title`, `description`, `emoji`, `category`, `tags`, `starts_at`, `ends_at`, `price_label`, `location` (PostGIS), `address`, `status`, `source`, `raw_email_id`
   - Indexes: `events_location_idx` (GIST), `events_status_idx`, `events_starts_at_idx`
   - Status: `pending`, `live`, `expired`

3. **email_queue** - Inbound email processing queue
   - Fields: `id`, `from_address`, `subject`, `body_text`, `body_html`, `parsed_data` (JSONB), `matched_venue_id`, `status`
   - Status: `pending`, `approved`, `rejected`

4. **attendees** - Event participants (anonymous or authenticated)
   - Fields: `id`, `event_id`, `user_id`, `display_name`, `joined_at`
   - Unique constraint: `(event_id, user_id)`

5. **messages** - Chat messages tied to events
   - Fields: `id`, `event_id`, `attendee_id`, `display_name`, `body`, `created_at`
   - Cascade delete: When event is deleted

**Functions:**

- `expire_events()` - Marks events as expired 2 hours after end time
- `get_nearby_events(lat, lng, radius_m, filter_category, result_limit)` - Returns events with distance, attendee count, and coordinates

**Realtime Publications:**

- `messages` - Live chat updates
- `events` - Event status changes
- `attendees` - Attendee count updates

### Design System

**Colors:**

- Background: `#0a0a0b`, `#111113`, `#18181c`
- Text: `#f0efe8` (primary), `#888784` (muted), `#3a3a3e` (faint)
- Accents: Purple `#7b6ef6`, Green `#3ecf8e`, Amber `#f5a623`, Coral `#f06449`, Blue `#4f9cf9`
- Border radius: Default 16px, Small 10px

**Typography:**

- Display: Syne (headings)
- Body: DM Sans (content)

**Layout:**

- Sidebar: 68px fixed width (vertical nav)
- Main: Flexible content area with scroll
- Right Panel: 300px fixed width (chat + venues)
- Mobile: Right panel hidden (`hidden lg:flex`)

---

## API Routes

### Public Endpoints

| Method | Path                    | Description                    | Query Params                                  | Returns                                  |
| ------ | ----------------------- | ------------------------------ | --------------------------------------------- | ---------------------------------------- |
| GET    | `/api/events/nearby`    | Get events within radius       | `lat`, `lng`, `radius_m`, `category`, `limit` | `{ events[], query, count }`             |
| POST   | `/api/events/[id]/join` | Join event and get chat access | Body: `{ displayName }`                       | `{ attendee_id, chat_channel, message }` |

### Admin/Webhook Endpoints

| Method | Path                            | Description                         | Auth           | Returns                                       |
| ------ | ------------------------------- | ----------------------------------- | -------------- | --------------------------------------------- |
| POST   | `/api/inbound-email`            | Webhook for inbound venue emails    | None (webhook) | `{ success, id, matched_venue, parsed_data }` |
| POST   | `/api/email-queue/[id]/approve` | Approve parsed email → create event | Service role   | `{ success, event_id, message }`              |
| GET    | `/api/cron/expire-events`       | Expire old events (Vercel cron)     | Bearer token   | `{ success, message, expired_count }`         |

### Auth Endpoints

| Method | Path                 | Description            | Returns  |
| ------ | -------------------- | ---------------------- | -------- |
| GET    | `/api/auth/callback` | OAuth callback handler | Redirect |

### Development Endpoints

| Method | Path             | Description                    | Query Params                                | Returns                                                                   |
| ------ | ---------------- | ------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| POST   | `/api/dev/seed`  | Generate events at real venues | `lat`, `lng`, `radius_m`, `count`, `source` | `{ venues_created, events_created, attendees_created, messages_created }` |
| POST   | `/api/dev/reset` | Clear all seeded data          | None                                        | `{ events_deleted, venues_deleted }`                                      |

**Note:** Dev endpoints return 403 in production.

---

## Data Flow

### 1. Event Discovery Flow

```
User opens app
  → Browser requests geolocation
  → Fetch /api/events/nearby?lat={lat}&lng={lng}&radius_m=1600
  → PostGIS query via get_nearby_events RPC
  → Return events sorted by distance with attendee counts
  → Render feed (hero + grid) and map markers
```

### 2. Join Event Flow

```
User clicks "I'm going"
  → Show JoinModal (first name + last initial)
  → POST /api/events/{id}/join with displayName
  → Create attendee record in DB
  → Return attendee_id + chat_channel
  → Subscribe to Realtime channel for messages
  → Show ChatPanel in right sidebar
```

### 3. Chat Flow

```
User types message
  → POST to messages table via Supabase client
  → Supabase Realtime broadcasts INSERT to all subscribers
  → All attendees receive new message via postgres_changes subscription
  → Message appears in ChatPanel
```

### 4. Email Pipeline Flow

```
Venue emails events@nowhere.app
  → Email provider (Resend/Postmark) POSTs to /api/inbound-email
  → Match from_address to venues.email
  → Parse email with Llama 3.3 70B (or fallback parser)
  → Insert to email_queue with parsed_data
  → Admin reviews in VenuePanel
  → POST /api/email-queue/{id}/approve
  → Create event record with status='live'
  → Event appears in feed
```

### 5. Event Expiry Flow

```
Vercel Cron (hourly)
  → GET /api/cron/expire-events
  → Call expire_events() Postgres function
  → UPDATE events SET status='expired' WHERE ends_at < now() - 2 hours
  → Cascade deletes attendees and messages
  → Expired events no longer returned by get_nearby_events
```

---

## Current Limitations

### Missing Features (Specified but Not Built)

1. **No direct event management API** - Events can only enter via email pipeline or dev seeder
2. **Sidebar pages incomplete** - `/my-events`, `/chats`, `/settings` routes don't exist
3. **Auth not integrated** - AuthProvider built but not used; join flow doesn't require login
4. **Filter buttons non-functional** - "Right now" and "Free only" buttons don't filter
5. **Email rejection** - No API endpoint to reject emails from queue
6. **Venue stats** - No `/api/venue/[id]/stats` endpoint
7. **Mobile app** - React Native/Expo mentioned in prompt but not started
8. **Responsive chat** - Right panel hidden on mobile; no way to access chat on small screens

### Known Issues

1. **Map markers reset** - Markers are recreated on every event list change (could optimize)
2. **No error states** - Limited error handling UI beyond basic loading states
3. **Auth callback error page** - Redirects to `/auth/error` which doesn't exist
4. **Duplicate join prevention** - Works via DB unique constraint but no UI feedback

---

## Testing Status

### ✅ Tested & Working

- Event discovery by location and radius
- Category filtering
- Distance calculation and display
- Map markers at real coordinates
- Join modal and name validation
- Real-time chat (send/receive messages)
- Attendee count updates
- Email parsing (both AI and fallback)
- Event expiry cron job
- Dev seeder (static venues)
- Venue email matching

### ⚠️ Needs Testing

- Foursquare API integration (requires API key)
- Magic link authentication
- Email webhook from Resend/Postmark
- Production deployment and scaling
- Mobile responsive behavior
- Error recovery and edge cases

### ❌ Not Testable Yet

- My Events page
- Chats page aggregation
- Settings page
- Email rejection flow
- Venue stats endpoint

---

## Deployment Configuration

**Vercel Configuration (`vercel.json`):**

- Cron job: `/api/cron/expire-events` runs hourly (`0 * * * *`)
- CORS headers configured for all `/api/*` routes

**Environment Variables Required:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `TOGETHER_AI_API_KEY` (optional, for email parsing)
- `FOURSQUARE_API_KEY` (optional, for dev seeder)
- `RESEND_API_KEY` or `POSTMARK_API_KEY` (for email pipeline)
- `CRON_SECRET` (for cron authentication)
- `NEXT_PUBLIC_APP_URL`

---

## Files Overview

**Total Files:** ~50 files across frontend, backend, database, and infrastructure

**Key Directories:**

- `src/app/` - Next.js pages and API routes (13 files)
- `src/components/` - React components (7 files)
- `src/lib/` - Utilities and integrations (4 files)
- `src/types/` - TypeScript definitions (1 file)
- `supabase/` - Database schema, migrations, seed (4 files)
- Root config files (10+ files)

**Lines of Code:** ~3,500 lines (estimated)

---

## Future Roadmap

### High Priority (MVP Completion)

1. Wire up authentication throughout the app
2. Build `/my-events`, `/chats`, `/settings` pages
3. Implement event CRUD API
4. Add email rejection flow
5. Fix filter buttons ("Right now", "Free only")
6. Mobile responsive improvements

### Medium Priority (Enhanced Features)

1. Event search and text filtering
2. User profiles (optional)
3. Event recommendations/favorites
4. Push notifications for joined events
5. Photo uploads for events
6. Event check-in verification

### Low Priority (Nice to Have)

1. React Native mobile app
2. Event analytics dashboard
3. Venue admin portal
4. Social sharing
5. Event reminders
6. Multiple cities support

---

**Document Version:** 1.0  
**Last Updated:** March 17, 2026  
**Status:** Development (MVP ~75% complete)
