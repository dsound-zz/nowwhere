# NowHere App - AI Coding Assistant Rules

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

## Notes

- The app is designed to work without user accounts for browsing
- Users only provide a name when joining events
- Events and chats auto-expire after the event ends
- Location permission is required for the full experience
