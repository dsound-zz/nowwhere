/**
 * Tool 2: Scrape venue websites for event information
 * Uses native fetch (no puppeteer) and LLM extraction
 */

import { ParsedEvent } from '@/lib/types/ingestion'
import { extractEventWithAI } from '@/lib/ai'

/**
 * Extract text content from HTML
 * Preserves title, headings, paragraphs, and time elements
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Extract key elements
  const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1] : ''
  
  // Extract headings
  const h1Matches = text.match(/<h1[^>]*>(.*?)<\/h1>/gi) || []
  const h2Matches = text.match(/<h2[^>]*>(.*?)<\/h2>/gi) || []
  const h3Matches = text.match(/<h3[^>]*>(.*?)<\/h3>/gi) || []
  
  const headings = [...h1Matches, ...h2Matches, ...h3Matches]
    .map((h) => h.replace(/<[^>]*>/g, ''))
    .join('\n')
  
  // Extract paragraphs
  const pMatches = text.match(/<p[^>]*>(.*?)<\/p>/gi) || []
  const paragraphs = pMatches
    .map((p) => p.replace(/<[^>]*>/g, ''))
    .join('\n')
  
  // Extract time elements
  const timeMatches = text.match(/<time[^>]*>(.*?)<\/time>/gi) || []
  const times = timeMatches
    .map((t) => t.replace(/<[^>]*>/g, ''))
    .join('\n')
  
  // Combine and clean
  const combined = `${title}\n${headings}\n${paragraphs}\n${times}`
  
  // Remove HTML entities and extra whitespace
  return combined
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Scrape a venue's website and extract event information
 * @param venueId The venue ID (for logging/tracking)
 * @param url The venue's website URL
 * @returns ParsedEvent or null on failure
 */
export async function scrapeVenueWebsite(
  venueId: string,
  url: string
): Promise<ParsedEvent | null> {
  try {
    console.log(`[venue-scraper] Fetching ${url} for venue ${venueId}`)

    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NowHere Event Bot/1.0 (Event Discovery App)',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const textContent = extractTextFromHtml(html)

    if (!textContent || textContent.length < 50) {
      console.log(`[venue-scraper] Insufficient content from ${url}`)
      return null
    }

    // Truncate to avoid token limits (keep first 3000 chars)
    const truncatedContent = textContent.substring(0, 3000)

    console.log(`[venue-scraper] Extracted ${truncatedContent.length} chars, sending to LLM`)

    // Use shared LLM extraction
    const extracted = await extractEventWithAI(
      `Venue Website URL: ${url}\n\nExtracted Content:\n${truncatedContent}`
    )

    if (!extracted) {
      console.log(`[venue-scraper] LLM extraction failed for ${url}`)
      return null
    }

    // Build ParsedEvent with venue_scrape source
    const parsedEvent: ParsedEvent = {
      title: extracted.title || 'Untitled Event',
      description: extracted.description || '',
      emoji: extracted.emoji || '📍',
      category: extracted.category || 'other',
      tags: extracted.tags || [],
      starts_at: extracted.starts_at || null,
      ends_at: extracted.ends_at || null,
      price_label: extracted.price_label || 'Free',
      address: extracted.address || null,
      confidence: extracted.confidence || 0.5,
      source: 'venue_scrape' as const,
      raw: { url, extracted },
    }

    console.log(`[venue-scraper] Successfully extracted event: ${parsedEvent.title}`)

    return parsedEvent
  } catch (error) {
    console.error(`[venue-scraper] Error scraping ${url}:`, error)
    return null // Never throw, return null on failure
  }
}
