import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all records
    const { data: allRecords } = await supabase
      .from('email_queue')
      .select('*')

    if (!allRecords || allRecords.length === 0) {
      return NextResponse.json({ message: 'No records found' })
    }

    // Check each record's status
    const statusInfo = allRecords.map(r => ({
      id: r.id,
      status: r.status,
      status_type: typeof r.status,
      status_value: JSON.stringify(r.status),
      from: r.from_address
    }))

    // Update all records to ensure status is properly set
    const updates = []
    for (const record of allRecords) {
      const { data, error } = await supabase
        .from('email_queue')
        .update({ status: 'pending' })
        .eq('id', record.id)
        .select()
      
      updates.push({
        id: record.id,
        updated: !error,
        error: error?.message
      })
    }

    // Now check if query works
    const { data: pendingAfter } = await supabase
      .from('email_queue')
      .select('id')
      .eq('status', 'pending')

    return NextResponse.json({
      before: statusInfo,
      updates,
      pending_count_after: pendingAfter?.length || 0
    })
  } catch (err) {
    console.error('[fix-status] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
