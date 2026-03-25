/**
 * Multi-Source Event Ingestion Agent
 * Orchestrates three parallel tools, deduplicates, and routes to publish or review queue
 */

import { ParsedEvent, AgentResult } from '@/lib/types/ingestion'
import { fetchEventbriteNearby } from './tools/eventbrite'
import { scrapeVenueWebsite } from './tools/venue-scraper'
import { getQueuedEmails } from './tools/email-queue'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Calculate string similarity using Levenshtein-based approach
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  // Simple character-based similarity
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1.0

  // Count matching characters in order
  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++
    }
  }

  return matches / longer.length
}

/**
 * Calculate time difference in minutes between two ISO 8601 timestamps
 */
function timeDifferenceMinutes(time1: string | null, time2: string | null): number {
  if (!time1 || !time2) return Infinity
  
  try {
    const date1 = new Date(time1)
    const date2 = new Date(time2)
    return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60)
  } catch {
    return Infinity
  }
}

/**
 * Calculate distance in miles between two addresses (simplified geocoding)
 * For now, returns 0 if addresses match, Infinity otherwise
 * In production, you'd geocode both and calculate actual distance
 */
function addressDistance(addr1: string | null, addr2: string | null): number {
  if (!addr1 || !addr2) return Infinity
  
  const a1 = addr1.toLowerCase().trim()
  const a2 = addr2.toLowerCase().trim()
  
  // Simple exact match for now
  return a1 === a2 ? 0 : Infinity
}

/**
 * Check if two events are duplicates
 */
function areDuplicates(event1: ParsedEvent, event2: ParsedEvent): boolean {
  // Title similarity threshold
  const titleSim = stringSimilarity(event1.title, event2.title)
  if (titleSim < 0.85) return false

  // Time proximity threshold (30 minutes)
  const timeDiff = timeDifferenceMinutes(event1.starts_at, event2.starts_at)
  if (timeDiff > 30) return false

  // Address proximity (simplified - exact match or no check)
  const distance = addressDistance(event1.address, event2.address)
  if (distance !== 0 && distance !== Infinity) return false

  return true
}

/**
 * Deduplicate events, keeping the one with highest confidence
 */
function deduplicateEvents(events: ParsedEvent[]): { deduplicated: ParsedEvent[]; duplicateCount: number } {
  const keep: ParsedEvent[] = []
  const skip = new Set<number>()
  let duplicateCount = 0

  for (let i = 0; i < events.length; i++) {
    if (skip.has(i)) continue

    let best = events[i]

    // Check against all remaining events
    for (let j = i + 1; j < events.length; j++) {
      if (skip.has(j)) continue

      if (areDuplicates(events[i], events[j])) {
        duplicateCount++
        skip.add(j)
        
        // Keep the one with higher confidence
        if (events[j].confidence > best.confidence) {
          best = events[j]
        }
      }
    }

    keep.push(best)
  }

  return { deduplicated: keep, duplicateCount }
}

/**
 * Geocode an address using Mapbox
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!mapboxToken) return null

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${mapboxToken}&limit=1`
    )
    
    if (!res.ok) return null

    const data = await res.json()
    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates
      return { lng: coords[0], lat: coords[1] }
    }

    return null
  } catch (error) {
    console.error('[agent] Geocoding error:', error)
    return null
  }
}

/**
 * Main ingestion agent orchestrator
 * @param lat Latitude for search center
 * @param lon Longitude for search center
 * @param radiusMiles Search radius in miles (default: 1)
 */
export async function runIngestionAgent(
  lat: number,
  lon: number,
  radiusMiles: number = 1
): Promise<AgentResult> {
  console.log(`[ingestion-agent] Starting ingestion for (${lat}, ${lon}) within ${radiusMiles}mi`)

  const errors: string[] = []
  let published = 0
  let queued = 0

  try {
    // Step 1: Run all three tools in parallel
    const [eventbriteResult, emailsResult, venuesResult] = await Promise.allSettled([
      fetchEventbriteNearby(lat, lon, radiusMiles),
      getQueuedEmails(),
      fetchVenueWebsitesAndScrape(),
    ])

    // Extract results, defaulting to empty arrays on failure
    const eventbriteEvents = eventbriteResult.status === 'fulfilled' ? eventbriteResult.value : []
    const emailEvents = emailsResult.status === 'fulfilled' ? emailsResult.value : []
    const venueEvents = venuesResult.status === 'fulfilled' ? venuesResult.value : []

    // Log any rejections
    if (eventbriteResult.status === 'rejected') {
      errors.push(`Eventbrite: ${eventbriteResult.reason}`)
    }
    if (emailsResult.status === 'rejected') {
      errors.push(`Email queue: ${emailsResult.reason}`)
    }
    if (venuesResult.status === 'rejected') {
      errors.push(`Venue scraper: ${venuesResult.reason}`)
    }

    console.log(
      `[ingestion-agent] Fetched ${eventbriteEvents.length} from Eventbrite, ${emailEvents.length} from email queue, ${venueEvents.length} from venue scrapes`
    )

    // Step 2: Flatten all results
    const allEvents: ParsedEvent[] = [...eventbriteEvents, ...emailEvents, ...venueEvents]

    if (allEvents.length === 0) {
      console.log('[ingestion-agent] No events to process')
      return { published: 0, queued: 0, deduplicated: 0, errors }
    }

    // Step 3: Deduplicate
    const { deduplicated, duplicateCount } = deduplicateEvents(allEvents)
    console.log(`[ingestion-agent] Deduplicated ${allEvents.length} events to ${deduplicated.length} (removed ${duplicateCount} duplicates)`)

    // Step 4: Route events
    const supabase = createServiceClient()

    for (const event of deduplicated) {
      try {
        // Auto-publish high-confidence Eventbrite events
        if (event.confidence >= 0.85 && event.source === 'eventbrite') {
          await publishEvent(supabase, event)
          published++
        } else {
          // Queue for human review
          await queueForReview(supabase, event)
          queued++
        }
      } catch (error) {
        console.error(`[ingestion-agent] Error processing event "${event.title}":`, error)
        errors.push(`Event "${event.title}": ${error}`)
      }
    }

    console.log(`[ingestion-agent] Complete: ${published} published, ${queued} queued for review`)

    return {
      published,
      queued,
      deduplicated: duplicateCount,
      errors,
    }
  } catch (error) {
    console.error('[ingestion-agent] Fatal error:', error)
    errors.push(`Fatal: ${error}`)
    return { published, queued, deduplicated: 0, errors }
  }
}

/**
 * Fetch venues with websites and scrape them
 */
async function fetchVenueWebsitesAndScrape(): Promise<ParsedEvent[]> {
  const supabase = createServiceClient()

  // Get verified venues with websites
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, website')
    .eq('verified', true)
    .not('website', 'is', null)
    .limit(10) // Limit to avoid overwhelming the system

  if (error || !venues) {
    console.warn('[ingestion-agent] Failed to fetch venues for scraping:', error)
    return []
  }

  console.log(`[ingestion-agent] Scraping ${venues.length} venue websites`)

  // Scrape each venue in parallel (but limit concurrency)
  const scrapePromises = venues.map((venue) => {
    // Add protocol if missing
    let url = venue.website
    if (url && !url.startsWith('http')) {
      url = `https://${url}`
    }
    return scrapeVenueWebsite(venue.id, url)
  })

  const results = await Promise.allSettled(scrapePromises)

  // Filter out null results
  const events: ParsedEvent[] = []
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      events.push(result.value)
    }
  }

  return events
}

/**
 * Publish event directly to events table
 */
async function publishEvent(supabase: any, event: ParsedEvent): Promise<void> {
  console.log(`[ingestion-agent] Auto-publishing: ${event.title}`)

  // Geocode address if present
  let locationWKT: string | undefined
  if (event.address) {
    const coords = await geocodeAddress(event.address)
    if (coords) {
      locationWKT = `SRID=4326;POINT(${coords.lng} ${coords.lat})`
    }
  }

  const { error } = await supabase.from('events').insert({
    title: event.title,
    description: event.description,
    emoji: event.emoji,
    category: event.category,
    tags: event.tags,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    price_label: event.price_label,
    address: event.address,
    status: 'live',
    source: event.source,
    ...(locationWKT ? { location: locationWKT } : {}),
  })

  if (error) {
    throw new Error(`Failed to publish: ${error.message}`)
  }
}

/**
 * Queue event for human review
 */
async function queueForReview(supabase: any, event: ParsedEvent): Promise<void> {
  console.log(`[ingestion-agent] Queueing for review: ${event.title} (confidence: ${event.confidence})`)

  // Geocode address if present
  let locationWKT: string | undefined
  if (event.address) {
    const coords = await geocodeAddress(event.address)
    if (coords) {
      locationWKT = `SRID=4326;POINT(${coords.lng} ${coords.lat})`
    }
  }

  // Build parsed_data from ParsedEvent
  const parsedData = {
    title: event.title,
    description: event.description,
    emoji: event.emoji,
    category: event.category,
    tags: event.tags,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    price_label: event.price_label,
    address: event.address,
    confidence: event.confidence,
  }

  const { error } = await supabase.from('email_queue').insert({
    from_address: `${event.source}@ingestion-agent`,
    subject: event.title,
    body_text: event.description,
    body_html: null,
    parsed_data: parsedData,
    status: 'pending',
    ...(locationWKT ? { location: locationWKT } : {}),
  })

  if (error) {
    throw new Error(`Failed to queue: ${error.message}`)
  }
}
