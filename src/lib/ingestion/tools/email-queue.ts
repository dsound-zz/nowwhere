/**
 * Tool 3: Get queued emails that need processing
 * Returns them as ParsedEvent[] for unified ingestion pipeline
 */

import { ParsedEvent } from '@/lib/types/ingestion'
import { createServiceClient } from '@/lib/supabase/server'

interface EmailQueueRow {
  id: string
  from_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  parsed_data: any
  matched_venue_id: string | null
  status: string
  confidence: number | null
  created_at: string
}

/**
 * Fetch pending emails from the email_queue table
 * @returns Array of ParsedEvent objects (empty on failure)
 */
export async function getQueuedEmails(): Promise<ParsedEvent[]> {
  try {
    const supabase = createServiceClient()

    console.log('[email-queue] Fetching pending emails')

    const { data, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50) // Limit to avoid overwhelming the system

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      console.log('[email-queue] No pending emails found')
      return []
    }

    console.log(`[email-queue] Found ${data.length} pending emails`)

    // Convert each email queue row to ParsedEvent format
    const parsedEvents: ParsedEvent[] = data
      .map((row: EmailQueueRow) => {
        // The parsed_data field should already contain event data
        if (!row.parsed_data) {
          console.warn(`[email-queue] Row ${row.id} has no parsed_data, skipping`)
          return null
        }

        const parsed = row.parsed_data as Partial<ParsedEvent>

        // Build a complete ParsedEvent, ensuring all required fields
        const event: ParsedEvent = {
          title: parsed.title || row.subject || 'Untitled Event',
          description: parsed.description || '',
          emoji: parsed.emoji || '📍',
          category: parsed.category || 'other',
          tags: parsed.tags || [],
          starts_at: parsed.starts_at || null,
          ends_at: parsed.ends_at || null,
          price_label: parsed.price_label || 'Free',
          address: parsed.address || null,
          confidence: parsed.confidence ?? row.confidence ?? 0.5,
          source: 'email' as const,
          raw: {
            email_queue_id: row.id,
            from_address: row.from_address,
            matched_venue_id: row.matched_venue_id,
          },
        }

        return event
      })
      .filter((e): e is ParsedEvent => e !== null)

    return parsedEvents
  } catch (error) {
    console.error('[email-queue] Error fetching queued emails:', error)
    return [] // Never throw, return empty array
  }
}
