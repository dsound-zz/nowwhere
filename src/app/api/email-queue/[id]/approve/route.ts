import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params
    const supabase = createServiceClient()

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

    const parsedData = queueItem.parsed_data as {
      title?: string
      description?: string
      emoji?: string
      category?: string
      tags?: string[]
      starts_at?: string | null
      ends_at?: string | null
      price_label?: string
      address?: string | null
      confidence?: number
    } | null

    if (!parsedData || !parsedData.title) {
      return NextResponse.json(
        { error: 'No parsed data available' },
        { status: 400 }
      )
    }

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        venue_id: queueItem.matched_venue_id as string | null,
        title: parsedData.title,
        description: parsedData.description || null,
        emoji: parsedData.emoji || '📍',
        category: parsedData.category || null,
        tags: parsedData.tags || null,
        starts_at: parsedData.starts_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        ends_at: parsedData.ends_at || null,
        price_label: parsedData.price_label || 'Free',
        address: parsedData.address || null,
        status: 'live',
        source: 'email',
        raw_email_id: emailId,
      })
      .select('id')
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    // Update email queue status with admin outcome tracking
    await supabase
      .from('email_queue')
      .update({
        status: 'approved',
        admin_outcome: 'approved',
        outcome_at: new Date().toISOString()
      })
      .eq('id', emailId)

    const eventRecord = event as Record<string, unknown>

    return NextResponse.json({
      success: true,
      event_id: eventRecord?.id,
      message: 'Event created and email approved',
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}