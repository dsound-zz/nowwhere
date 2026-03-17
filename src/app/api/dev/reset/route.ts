import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Guard: only allow in development
function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

export async function POST(request: NextRequest) {
  // Safety check
  if (!isDevelopment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const supabase = createServiceClient()

    // Step 1: Delete all events where source = 'seed'
    const { error: eventError, count: eventsDeleted } = await supabase
      .from('events')
      .delete({ count: 'exact' })
      .eq('source', 'seed')

    if (eventError) {
      console.error('Event deletion error:', eventError)
      return NextResponse.json(
        { error: 'Failed to delete events', details: eventError.message },
        { status: 500 }
      )
    }

    // Step 2: Delete venues with email ending in @seed.nowhere.app (our seeded venues)
    const { error: venueError, count: venuesDeleted } = await supabase
      .from('venues')
      .delete({ count: 'exact' })
      .like('email', '%@seed.nowhere.app')

    if (venueError) {
      console.error('Venue deletion error:', venueError)
      // Non-fatal, continue
    }

    return NextResponse.json({
      success: true,
      events_deleted: eventsDeleted || 0,
      venues_deleted: venuesDeleted || 0,
      message: 'Seed data cleared successfully',
    })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
