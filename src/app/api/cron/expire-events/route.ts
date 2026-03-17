import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// This endpoint should be called by a cron job (e.g., Vercel Cron or external scheduler)
// It expires events that ended more than 2 hours ago

export async function GET(request: NextRequest) {
  // Verify authorization header for cron jobs
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = createServiceClient()

    // Call the expire_events function
    const { error } = await supabase.rpc('expire_events')

    if (error) {
      console.error('Error expiring events:', error)
      return NextResponse.json(
        { error: 'Failed to expire events' },
        { status: 500 }
      )
    }

    // Get count of expired events
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')

    return NextResponse.json({
      success: true,
      message: 'Events expired successfully',
      expired_count: count,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}