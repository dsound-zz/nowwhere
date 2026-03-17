# NowHere

A frictionless local events app showing what's happening within ~1 mile of you right now or tonight.

## Features

- **Location-based feed**: See events happening near you in real-time
- **No account required**: Browse freely, join events with just your name
- **Real-time chat**: Instantly dropped into a group chat when you join an event
- **Venue email pipeline**: Venues can post events via email, parsed by AI
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
- `TOGETHER_AI_API_KEY` - Together AI API key (optional, for email parsing)

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

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events/nearby` | GET | Get events within radius of coordinates |
| `/api/events/[id]/join` | POST | Join an event and get chat access |
| `/api/inbound-email` | POST | Webhook for inbound emails (Resend/Postmark) |
| `/api/email-queue/[id]/approve` | POST | Approve a parsed email to create an event |
| `/api/cron/expire-events` | GET | Cron job to expire old events |

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── map/           # Map view page
│   └── page.tsx       # Main feed page
├── components/
│   ├── chat/          # Chat components
│   ├── events/        # Event cards and panels
│   ├── layout/        # Sidebar and layout
│   └── providers/     # Auth provider
├── lib/
│   └── supabase/      # Supabase client utilities
└── types/
    └── database.ts    # TypeScript types for database
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

The `vercel.json` configures automatic cron jobs for event expiry.

## License

MIT
# nowwhere
# nowwhere
