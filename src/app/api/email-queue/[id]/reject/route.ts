import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params
    const supabase = createServiceClient()

    // Get optional reason from body
    let reason = null
    try {
      const body = await request.json()
      reason = body.reason || null
    } catch {
      // No body provided
    }

    // Get the email queue item
    const { data: emailQueue, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', emailId)
      .single()

    if (fetchError || !emailQueue) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    const queueItem = emailQueue as Record<string, unknown>

    if (queueItem.status !== 'pending') {
      return NextResponse.json(
        { error: 'Email already processed' },
        { status: 400 }
      )
    }

    // Update with rejection reason if provided and add admin outcome tracking
    const updateData: Record<string, unknown> = {
      status: 'rejected',
      admin_outcome: 'rejected',
      outcome_at: new Date().toISOString()
    }
    
    if (reason) {
      const parsedData = (queueItem.parsed_data as Record<string, unknown>) || {}
      updateData.parsed_data = {
        ...parsedData,
        rejection_reason: reason,
        rejected_at: new Date().toISOString()
      }
    }

    // Update email queue status to rejected
    const { error: updateError } = await supabase
      .from('email_queue')
      .update(updateData)
      .eq('id', emailId)

    if (updateError) {
      console.error('Error rejecting email:', updateError)
      return NextResponse.json(
        { error: 'Failed to reject email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email rejected',
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
