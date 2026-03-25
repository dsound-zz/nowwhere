/**
 * Tool 1: Fetch events from Eventbrite API
 * Normalizes results into ParsedEvent format
 */

import { ParsedEvent } from '@/lib/types/ingestion'

interface EventbriteEvent {
  id: string
  name: {
    text: string
  }
  description: {
    text: string
  }
  start: {
    timezone: string
    local: string
    utc: string
  }
  end: {
    timezone: string
    local: string
    utc: string
  }
  is_free: boolean
  venue?: {
    address?: {
      address_1?: string
      city?: string
      region?: string
      postal_code?: string
      localized_address_display?: string
    }
    latitude?: string
    longitude?: string
  }
}

interface EventbriteResponse {
  events: EventbriteEvent[]
  pagination: {
    page_count: number
    page_number: number
  }
}

/**
 * Categorize event based on name and description keywords
 */
function categorizeEvent(name: string, description: string): ParsedEvent['category'] {
  const combinedText = `${name} ${description}`.toLowerCase()
  
  const categoryKeywords: Record<ParsedEvent['category'], string[]> = {
    music: ['music', 'concert', 'dj', 'jazz', 'band', 'live music', 'performance', 'festival', 'open mic'],
    food: ['food', 'taco', 'ramen', 'dinner', 'brunch', 'tasting', 'crawl', 'restaurant', 'cooking'],
    art: ['art', 'gallery', 'painting', 'workshop', 'creative', 'studio', 'exhibition', 'museum'],
    sport: ['sport', 'basketball', 'soccer', 'yoga', 'run', 'pickup', 'fitness', 'workout', 'athletic'],
    social: ['trivia', 'meetup', 'social', 'networking', 'party', 'happy hour', 'mixer'],
    other: [],
  }

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (cat !== 'other' && keywords.some((kw) => combinedText.includes(kw))) {
      return cat as ParsedEvent['category']
    }
  }

  return 'other'
}

/**
 * Choose an emoji based on category
 */
function getEmojiForCategory(category: ParsedEvent['category']): string {
  const emojiMap: Record<ParsedEvent['category'], string> = {
    music: '🎵',
    food: '🍽️',
    art: '🎨',
    sport: '⚽',
    social: '🎉',
    other: '📍',
  }
  return emojiMap[category]
}

/**
 * Extract tags from event text
 */
function extractTags(name: string, description: string): string[] {
  const commonTags = ['live', 'free', 'outdoor', 'indoor', 'kids', 'family', 'late night', 'weekend']
  const combinedText = `${name} ${description}`.toLowerCase()
  
  const tags: string[] = []
  for (const tag of commonTags) {
    if (combinedText.includes(tag)) {
      tags.push(tag)
      if (tags.length >= 5) break
    }
  }
  
  return tags
}

/**
 * Fetch events from Eventbrite near the given coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @param radiusMiles Search radius in miles (default: 1)
 * @returns Array of ParsedEvent objects (empty on failure)
 */
export async function fetchEventbriteNearby(
  lat: number,
  lon: number,
  radiusMiles: number = 1
): Promise<ParsedEvent[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY

  if (!apiKey) {
    console.warn('[eventbrite] API key not configured')
    return []
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      'location.latitude': lat.toString(),
      'location.longitude': lon.toString(),
      'location.within': `${radiusMiles}mi`,
      'start_date.range_start': new Date().toISOString(),
      'expand': 'venue',
    })

    console.log(`[eventbrite] Fetching events near ${lat}, ${lon} within ${radiusMiles}mi`)

    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`)
    }

    const data: EventbriteResponse = await response.json()

    if (!data.events || data.events.length === 0) {
      console.log('[eventbrite] No events found')
      return []
    }

    console.log(`[eventbrite] Found ${data.events.length} events`)

    // Normalize each event to ParsedEvent format
    const parsedEvents: ParsedEvent[] = data.events.map((event) => {
      const category = categorizeEvent(event.name.text, event.description?.text || '')
      const emoji = getEmojiForCategory(category)
      const tags = extractTags(event.name.text, event.description?.text || '')

      // Build address string
      let address: string | null = null
      if (event.venue?.address) {
        const addr = event.venue.address
        address = addr.localized_address_display || 
                  `${addr.address_1 || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postal_code || ''}`.trim()
      }

      // Build price label
      const priceLabel = event.is_free ? 'Free' : '$'

      // Description - truncate to 120 chars
      const description = (event.description?.text || event.name.text)
        .substring(0, 120)
        .trim()

      return {
        title: event.name.text,
        description,
        emoji,
        category,
        tags,
        starts_at: event.start.utc,
        ends_at: event.end.utc,
        price_label: priceLabel,
        address,
        confidence: 0.9, // High confidence for structured API data
        source: 'eventbrite' as const,
        raw: event, // Store original for debugging
      }
    })

    return parsedEvents
  } catch (error) {
    console.error('[eventbrite] Error fetching events:', error)
    return [] // Never throw, return empty array
  }
}
