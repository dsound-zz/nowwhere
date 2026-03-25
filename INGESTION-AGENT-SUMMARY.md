# Multi-Source Event Ingestion Agent — Implementation Summary

## Overview

Built a comprehensive event ingestion agent that pulls from three sources in parallel, deduplicates results, and routes events to either auto-publish or human review queue.

## Architecture

### Core Components

#### 1. Type System ([`src/lib/types/ingestion.ts`](nowhere-app/src/lib/types/ingestion.ts))

- [`ParsedEvent`](nowhere-app/src/lib/types/ingestion.ts:8) interface: Standard format for all ingestion sources
- [`AgentResult`](nowhere-app/src/lib/types/ingestion.ts:24) interface: Return type for agent orchestration

#### 2. Shared AI Layer ([`src/lib/ai/`](nowhere-app/src/lib/ai/))

- [`prompts.ts`](nowhere-app/src/lib/ai/prompts.ts): Extracted [`EVENT_EXTRACTION_PROMPT`](nowhere-app/src/lib/ai/prompts.ts:7) for reuse
- [`index.ts`](nowhere-app/src/lib/ai/index.ts):
  - [`extractEventWithAI()`](nowhere-app/src/lib/ai/index.ts:19): Centralized Together AI API calls
  - [`fallbackParse()`](nowhere-app/src/lib/ai/index.ts:65): Keyword-based fallback when AI unavailable

#### 3. Ingestion Tools

**Tool 1: Eventbrite** ([`src/lib/ingestion/tools/eventbrite.ts`](nowhere-app/src/lib/ingestion/tools/eventbrite.ts))

- [`fetchEventbriteNearby(lat, lon, radiusMiles)`](nowhere-app/src/lib/ingestion/tools/eventbrite.ts:120)
- Calls Eventbrite Events Search API with location params
- Normalizes to [`ParsedEvent`](nowhere-app/src/lib/types/ingestion.ts:8) format
- Sets `confidence: 0.9` (high confidence for structured data)
- Source: `'eventbrite'`

**Tool 2: Venue Scraper** ([`src/lib/ingestion/tools/venue-scraper.ts`](nowhere-app/src/lib/ingestion/tools/venue-scraper.ts))

- [`scrapeVenueWebsite(venueId, url)`](nowhere-app/src/lib/ingestion/tools/venue-scraper.ts:45)
- Fetches HTML via native fetch (10s timeout)
- Extracts text from `<title>`, `<h1-h3>`, `<p>`, `<time>` tags
- Sends to LLM using shared [`extractEventWithAI()`](nowhere-app/src/lib/ai/index.ts:19)
- Source: `'venue_scrape'`

**Tool 3: Email Queue** ([`src/lib/ingestion/tools/email-queue.ts`](nowhere-app/src/lib/ingestion/tools/email-queue.ts))

- [`getQueuedEmails()`](nowhere-app/src/lib/ingestion/tools/email-queue.ts:37)
- Queries `email_queue` table for `status = 'pending'`
- Returns up to 50 pending emails as [`ParsedEvent[]`](nowhere-app/src/lib/types/ingestion.ts:8)
- Source: `'email'`

#### 4. Agent Orchestrator ([`src/lib/ingestion/agent.ts`](nowhere-app/src/lib/ingestion/agent.ts))

[`runIngestionAgent(lat, lon, radiusMiles)`](nowhere-app/src/lib/ingestion/agent.ts:106) implements:

1. **Parallel Execution**: Uses `Promise.allSettled()` to call all three tools
2. **Deduplication**:
   - Groups events where title similarity > 0.85 AND start time within 30 min
   - Keeps highest confidence event from each duplicate group
   - Simple string similarity algorithm (no external deps)
3. **Routing Logic**:
   - Auto-publish: `confidence >= 0.85` AND `source === 'eventbrite'`
   - Human review: Everything else goes to `email_queue` table
4. **Geocoding**: Uses Mapbox to convert addresses to PostGIS points

#### 5. Cron Endpoint ([`src/app/api/cron/ingest-events/route.ts`](nowhere-app/src/app/api/cron/ingest-events/route.ts))

- GET handler protected by `CRON_SECRET` env var
- Runs for NYC (40.7128, -74.0060) within 1 mile
- Returns stats: published, queued, deduplicated, errors

#### 6. Vercel Cron Config ([`vercel.json`](nowhere-app/vercel.json))

- Added cron job: runs every 2 hours (`0 */2 * * *`)

### Refactored Email Route

Updated [`src/app/api/inbound-email/route.ts`](nowhere-app/src/app/api/inbound-email/route.ts) to use shared AI utilities:

- Now imports [`extractEventWithAI()`](nowhere-app/src/lib/ai/index.ts:19) and [`fallbackParse()`](nowhere-app/src/lib/ai/index.ts:65)
- Removed duplicate prompt and LLM logic

## Environment Variables Required

Add to `.env.local`:

```bash
EVENTBRITE_API_KEY=your-eventbrite-api-key
CRON_SECRET=your-random-secret-string
```

## Key Features

### Error Handling

- All tools return empty arrays on failure (never throw)
- `Promise.allSettled()` ensures one source failure doesn't block others
- Agent collects errors array for monitoring

### Logging

All components use tagged console logs:

- `[eventbrite]` - Eventbrite API calls
- `[venue-scraper]` - Website scraping
- `[email-queue]` - Email queue queries
- `[ingestion-agent]` - Orchestration steps
- `[ai]` - LLM extraction

### Auto-Publish Criteria

Events are auto-published (bypass review) when:

1. Confidence >= 0.85 (high confidence)
2. Source is 'eventbrite' (structured API data)

All other events route to `email_queue` for human review.

### Deduplication Algorithm

Considers events duplicates if ALL match:

- Title similarity > 85% (Levenshtein-based)
- Start time within 30 minutes
- Same address (exact match)

Keeps the event with highest confidence score.

## Data Flow

```
┌─────────────────┐
│  Cron Trigger   │ Every 2 hours
│  (Vercel Cron)  │
└────────┬────────┘
         │
         v
┌────────────────────────────────────────┐
│   runIngestionAgent(NYC coords)        │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Promise.allSettled([             │ │
│  │   fetchEventbriteNearby(),       │ │
│  │   getQueuedEmails(),             │ │
│  │   fetchVenueWebsitesAndScrape()  │ │
│  │ ])                               │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Deduplicate (title + time + loc)│ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Route each event:                │ │
│  │ • High confidence Eventbrite     │ │
│  │   → Auto-publish to events table│ │
│  │ • All others                     │ │
│  │   → Queue to email_queue         │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
         │
         v
┌─────────────────┐
│  AgentResult    │ { published, queued, deduplicated, errors }
└─────────────────┘
```

## Testing

To test the agent manually:

```bash
# Add env vars to .env.local
EVENTBRITE_API_KEY=your-key
CRON_SECRET=test-secret

# Call the cron endpoint
curl http://localhost:3000/api/cron/ingest-events \
  -H "Authorization: Bearer test-secret"
```

## Next Steps / Future Enhancements

1. **Venue Discovery**: Auto-create venues from Eventbrite organizer data
2. **Smarter Deduplication**: Use geocoding for actual distance calculations
3. **Rate Limiting**: Add throttling for venue scraping (currently scrapes 10 at once)
4. **Monitoring**: Add metrics tracking to database
5. **Dynamic Locations**: Support multiple cities (currently hardcoded to NYC)
6. **Webhook Support**: Real-time ingestion from Eventbrite webhooks
7. **ML Improvements**: Fine-tune confidence thresholds based on approval rates

## Files Created

- [`src/lib/types/ingestion.ts`](nowhere-app/src/lib/types/ingestion.ts)
- [`src/lib/ai/prompts.ts`](nowhere-app/src/lib/ai/prompts.ts)
- [`src/lib/ai/index.ts`](nowhere-app/src/lib/ai/index.ts)
- [`src/lib/ingestion/tools/eventbrite.ts`](nowhere-app/src/lib/ingestion/tools/eventbrite.ts)
- [`src/lib/ingestion/tools/venue-scraper.ts`](nowhere-app/src/lib/ingestion/tools/venue-scraper.ts)
- [`src/lib/ingestion/tools/email-queue.ts`](nowhere-app/src/lib/ingestion/tools/email-queue.ts)
- [`src/lib/ingestion/agent.ts`](nowhere-app/src/lib/ingestion/agent.ts)
- [`src/app/api/cron/ingest-events/route.ts`](nowhere-app/src/app/api/cron/ingest-events/route.ts)

## Files Modified

- [`src/app/api/inbound-email/route.ts`](nowhere-app/src/app/api/inbound-email/route.ts) - Refactored to use shared AI utilities
- [`vercel.json`](nowhere-app/vercel.json) - Added cron job
- [`.env.local.example`](nowhere-app/.env.local.example) - Added EVENTBRITE_API_KEY and CRON_SECRET
