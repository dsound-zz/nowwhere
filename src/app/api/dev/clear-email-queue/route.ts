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

    // First, fetch all records to show what we're deleting
    const { data: before, error: fetchError } = await supabase
      .from('email_queue')
      .select('id, from_address, subject, status, received_at')
      .order('received_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch email queue', details: fetchError.message },
        { status: 500 }
      )
    }

    console.log('Current email_queue records:', before)

    // Delete all pending records
    const { error: deleteError, count } = await supabase
      .from('email_queue')
      .delete({ count: 'exact' })
      .eq('status', 'pending')

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete records', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email queue cleared',
      records_before: before?.length || 0,
      records_deleted: count || 0,
      deleted_records: before || [],
    })
  } catch (error) {
    console.error('Clear email queue error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
