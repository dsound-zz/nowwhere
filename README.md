# NowHere

A frictionless local events app showing what's happening within ~1 mile of you right now or tonight.

## Features

- **Location-based feed**: See events happening near you in real-time
- **No account required**: Browse freely, join events with just your name
- **Real-time chat**: Instantly dropped into a group chat when you join an event
- **Multi-source event ingestion**: Automated agent pulls events from:
  - Eventbrite API (auto-publishes high-confidence events)
  - Venue website scraping (LLM-powered extraction)
  - Email pipeline (venues can post via email, parsed by AI)
- **Intelligent deduplication**: Automatically merges duplicate events from multiple sources
- **Auto-expiry**: Events and chats expire automatically after they end

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Database**: Supabase (Postgres + PostGIS + Realtime + Auth)
- **Email**: Resend/Postmark inbound webhooks
- **AI**: Llama 3.3 70B via Together AI
- **Maps**: Mapbox GL JS
- **Deployment**: Vercel

## Getting Started

### 1. Clone and install dependencies

```bash
cd nowhere-app
npm install
```

### 2. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox public token
- `TOGETHER_AI_API_KEY` - Together AI API key (for AI event extraction)
- `EVENTBRITE_API_KEY` - Eventbrite API key (for event ingestion)
- `CRON_SECRET` - Secret for protecting cron endpoints
- `RESEND_API_KEY` - Resend API key (for email ingestion)

### 3. Set up Supabase

1. Create a new Supabase project
2. Enable PostGIS extension: `create extension if not exists postgis;`
3. Run the schema migration from `supabase/schema.sql`
4. (Optional) Run the seed data from `supabase/seed.sql`

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## API Routes

| Route                           | Method | Description                                                    |
| ------------------------------- | ------ | -------------------------------------------------------------- |
| `/api/events/nearby`            | GET    | Get events within radius of coordinates                        |
| `/api/events/[id]/join`         | POST   | Join an event and get chat access                              |
| `/api/inbound-email`            | POST   | Webhook for inbound emails (Resend/Postmark)                   |
| `/api/email-queue/[id]/approve` | POST   | Approve a parsed email to create an event                      |
| `/api/cron/expire-events`       | GET    | Cron job to expire old events (runs every hour)                |
| `/api/cron/ingest-events`       | GET    | Cron job for multi-source event ingestion (runs every 2 hours) |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/              # Cron jobs (expire-events, ingest-events)
│   │   ├── events/            # Event endpoints
│   │   ├── email-queue/       # Email review endpoints
│   │   └── inbound-email/     # Email webhook handler
│   ├── admin/                 # Admin dashboard pages
│   ├── map/                   # Map view page
│   └── page.tsx               # Main feed page
├── components/
│   ├── chat/                  # Chat components
│   ├── events/                # Event cards and panels
│   ├── layout/                # Sidebar and layout
│   └── providers/             # Auth provider
├── lib/
│   ├── ai/                    # Shared AI utilities
│   │   ├── prompts.ts         # LLM prompts
│   │   └── index.ts           # extractEventWithAI, fallbackParse
│   ├── ingestion/             # Multi-source event ingestion
│   │   ├── agent.ts           # Orchestrator (parallel fetch + dedup + route)
│   │   └── tools/             # Data source tools
│   │       ├── eventbrite.ts  # Eventbrite API
│   │       ├── venue-scraper.ts # Website scraping + LLM
│   │       └── email-queue.ts # Email queue integration
│   └── supabase/              # Supabase client utilities
└── types/
    ├── database.ts            # Database types
    └── ingestion.ts           # ParsedEvent, AgentResult types
```

## Database Schema

The app uses PostGIS for location queries:

- **venues** - Registered venues with location
- **events** - Events with PostGIS geography points
- **attendees** - Event attendance tracking
- **messages** - Real-time chat messages
- **email_queue** - Inbound email processing queue

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

The `vercel.json` configures automatic cron jobs:

- **Event expiry**: Runs every hour to expire old events
- **Event ingestion**: Runs every 2 hours to fetch from Eventbrite, scrape venues, and process email queue

## Event Ingestion Architecture

The multi-source ingestion agent (`src/lib/ingestion/agent.ts`) coordinates three parallel data sources:

1. **Eventbrite API** - Fetches nearby events, high confidence (0.9)
2. **Venue Website Scraper** - Scrapes up to 10 verified venue websites, uses LLM extraction
3. **Email Queue** - Processes pending emails from the database

**Deduplication**: Events are considered duplicates if title similarity >85%, start time within 30 minutes, and same address. The highest confidence version is kept.

**Auto-Publish**: Events with confidence ≥0.85 from Eventbrite are auto-published. All others go to the email queue for human review.

See `INGESTION-AGENT-SUMMARY.md` for detailed documentation.

## License

MIT
