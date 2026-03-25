/**
 * Standard ParsedEvent type for all ingestion sources
 * Used by: email queue, Eventbrite, venue scrapers, and agent orchestration
 */
export interface ParsedEvent {
  title: string
  description: string
  emoji: string
  category: 'music' | 'food' | 'art' | 'sport' | 'social' | 'other'
  tags: string[]
  starts_at: string | null  // ISO 8601
  ends_at: string | null     // ISO 8601
  price_label: string
  address: string | null
  confidence: number         // 0-1
  source: 'email' | 'eventbrite' | 'venue_scrape'
  raw?: unknown             // original source data for debugging
}

/**
 * Result from the ingestion agent orchestrator
 */
export interface AgentResult {
  published: number
  queued: number
  deduplicated: number
  errors: string[]
}
