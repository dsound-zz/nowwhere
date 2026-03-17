import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    
    // Get the current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get request body for anonymous users
    let body = null
    if (!user) {
      try {
        body = await request.json()
      } catch {
        // No body provided
      }
    }
    
    const displayName = body?.displayName || null
    
    // Validate display name format (First name + last initial)
    if (displayName && !/^[A-Z][a-z]+ [A-Z]\.$/.test(displayName)) {
      return NextResponse.json(
        { error: 'Display name must be in format "First L." (e.g., "Jamie K.")' },
        { status: 400 }
      )
    }
    
    // Check if event exists and is live
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .single()
    
    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    if (event.status !== 'live') {
      return NextResponse.json(
        { error: 'Cannot join an event that is not live' },
        { status: 400 }
      )
    }
    
    // Create attendee record
    const attendeeData = {
      event_id: eventId,
      user_id: user?.id || null,
      display_name: displayName
    }
    
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .insert(attendeeData)
      .select('id')
      .single()
    
    if (attendeeError) {
      // Check if it's a duplicate join
      if (attendeeError.code === '23505') {
        return NextResponse.json(
          { error: 'Already joined this event' },
          { status: 400 }
        )
      }
      console.error('Error creating attendee:', attendeeError)
      return NextResponse.json(
        { error: 'Failed to join event' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      attendee_id: attendee.id,
      chat_channel: `event-${eventId}`,
      message: 'Successfully joined event'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}