import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get the specific record
    const { data: record } = await supabase
      .from('email_queue')
      .select('id, status, from_address')
      .eq('id', 'fdc6a010-dfd8-4ffd-b395-96434802c998')
      .single()

    if (!record) {
      return NextResponse.json({ error: 'Record not found' })
    }

    // Check status value details
    const statusValue = record.status
    const statusLength = statusValue?.length
    const statusBytes = statusValue ? Buffer.from(statusValue).toString('hex') : null
    const statusCharCodes = statusValue ? statusValue.split('').map(c => c.charCodeAt(0)) : null

    // Try different query methods
    const { data: eqQuery } = await supabase
      .from('email_queue')
      .select('id')
      .eq('status', 'pending')

    const { data: iLikeQuery } = await supabase
      .from('email_queue')
      .select('id')
      .ilike('status', 'pending')

    const { data: rawQuery, error: rawError } = await supabase
      .rpc('exec_sql', {
        sql: "SELECT id, status, LENGTH(status) as status_length, encode(status::bytea, 'hex') as status_hex FROM email_queue WHERE id = 'fdc6a010-dfd8-4ffd-b395-96434802c998'"
      })
      .single()

    return NextResponse.json({
      record_status: statusValue,
      status_length: statusLength,
      status_bytes: statusBytes,
      status_char_codes: statusCharCodes,
      eq_query_results: eqQuery?.length || 0,
      ilike_query_results: iLikeQuery?.length || 0,
      raw_query: rawQuery,
      raw_error: rawError?.message,
    })
  } catch (err) {
    console.error('[debug-status] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
