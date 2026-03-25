# NowHere — Agent Context

## What This App Is

NowHere is a local events discovery app for NYC. It shows events happening within ~1 mile of
the user right now or tonight. No account required to browse. Real-time chat drops in when
you join an event. Events auto-expire when they end.

## Current Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase: Postgres + PostGIS (geospatial) + Realtime + Auth
- AI: Llama 3.3-70B via Together AI API
- Maps: Mapbox GL JS
- Deployment: Vercel (with cron jobs configured in vercel.json)
- Email ingest: Resend/Postmark inbound webhooks → /api/inbound-email

## Current AI Layer

- /api/inbound-email: parses venue emails with Llama 3.3, extracts structured event data
  (title, description, emoji, category, tags, starts_at, ends_at, price_label, address,
  confidence 0-1), stores in email_queue table for human review before publishing
- Fallback: keyword-based category detection if Together AI API is unavailable

## Database Schema (key tables)

- venues: id, name, email, address, lat, lon, verified (bool)
- events: id, venue_id, title, description, emoji, category, tags[], starts_at, ends_at,
  price_label, location (PostGIS geography), active (bool)
- attendees: event_id, user_id, joined_at
- messages: event_id, user_id, content, created_at
- email_queue: id, from_address, subject, body_text, body_html, parsed_data (jsonb),
  matched_venue_id, status (pending/approved/rejected), confidence, created_at

## Coding Conventions

- All API routes in src/app/api/[route]/route.ts
- Supabase server client: import { createClient } from '@/lib/supabase/server'
- Supabase service client (bypasses RLS): import { createServiceClient } from '@/lib/supabase/server'
- Types in src/types/database.ts
- Shared lib utilities in src/lib/
- All LLM calls go through src/lib/ai/ — never call Together AI directly from a route
- Always include a confidence score (0-1) on any AI output
- Always include a fallback when AI is unavailable
- Error responses: { error: string } with appropriate HTTP status
- Log format: console.log('[module-name] message', data)
