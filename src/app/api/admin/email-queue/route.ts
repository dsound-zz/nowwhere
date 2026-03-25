import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Debug: Log what client we're using
    console.log('[admin-email-queue] Fetching with service client')

    // Get pending emails from the queue
    const { data: emailQueue, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('received_at', { ascending: false })

    console.log('[admin-email-queue] Query result:', {
      count: emailQueue?.length || 0,
      error: error?.message,
      hasData: !!emailQueue
    })

    if (error) {
      console.error('[admin-email-queue] Error fetching email queue:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email queue' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: emailQueue || [] })
  } catch (err) {
    console.error('[admin-email-queue] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
