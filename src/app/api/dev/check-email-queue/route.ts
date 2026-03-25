import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Fetch ALL records (not just pending)
    const { data: allRecords, error: allError } = await supabase
      .from('email_queue')
      .select('*')
      .order('received_at', { ascending: false })

    // Fetch only pending
    const { data: pendingRecords, error: pendingError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('received_at', { ascending: false })

    // Check for the specific ID from your test
    const { data: specificRecord, error: specificError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', 'fdc6a010-dfd8-4ffd-b395-96434802c998')
      .maybeSingle()

    return NextResponse.json({
      all_records_count: allRecords?.length || 0,
      all_records: allRecords || [],
      pending_records_count: pendingRecords?.length || 0,
      pending_records: pendingRecords || [],
      specific_test_record: specificRecord,
      errors: {
        all: allError?.message,
        pending: pendingError?.message,
        specific: specificError?.message,
      }
    })
  } catch (err) {
    console.error('[check-email-queue] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
