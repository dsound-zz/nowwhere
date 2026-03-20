import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// FR-5 & FR-11: Anonymous auth support for "First L." format users
// This endpoint handles both authenticated and anonymous sign-in flows

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    
    // Get the current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get request body
    let body = null
    try {
      body = await request.json()
    } catch {
      // No body provided
    }
    
    const displayName = body?.displayName || null
    const isAnonymousSignIn = body?.anonymousSignIn === true
    
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
    
    let currentUserId = user?.id || null
    
    // FR-5 & FR-11: If user is not authenticated and provides "First L." name,
    // create an anonymous auth session
    if (!user && displayName && isAnonymousSignIn) {
      // Use service client to create anonymous user
      const serviceClient = createServiceClient()
      
      const { data: anonData, error: anonError } = await serviceClient.auth.admin.createUser({
        email: undefined,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          is_anonymous: true
        }
      })
      
      if (anonError || !anonData.user) {
        console.error('Error creating anonymous user:', anonError)
        return NextResponse.json(
          { error: 'Failed to create anonymous session' },
          { status: 500 }
        )
      }
      
      currentUserId = anonData.user.id
      
      // Return the anonymous user ID so client can set up session
      // Note: In production, you'd want to use a proper anonymous sign-in flow
      // For now, we'll create the attendee with the anonymous user ID
    }
    
    // Create attendee record
    const attendeeData = {
      event_id: eventId,
      user_id: currentUserId,
      display_name: displayName
    }
    
    // Use service client if we created an anonymous user, otherwise use regular client
    const clientToUse = (!user && currentUserId) ? createServiceClient() : supabase
    
    const { data: attendee, error: attendeeError } = await clientToUse
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
      message: 'Successfully joined event',
      anonymous_user_id: (!user && currentUserId) ? currentUserId : undefined
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}