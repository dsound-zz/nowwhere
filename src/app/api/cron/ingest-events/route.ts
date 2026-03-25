/**
 * Cron route for multi-source event ingestion
 * Runs every 2 hours to fetch events from Eventbrite, venue scrapers, and email queue
 */

import { NextRequest, NextResponse } from 'next/server'
import { runIngestionAgent } from '@/lib/ingestion/agent'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('[cron/ingest-events] Starting ingestion run')

    // Default to NYC coordinates
    const lat = 40.7128
    const lon = -74.0060
    const radiusMiles = 1

    const result = await runIngestionAgent(lat, lon, radiusMiles)

    console.log('[cron/ingest-events] Ingestion complete:', result)

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cron/ingest-events] Error:', error)
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(error) },
      { status: 500 }
    )
  }
}
