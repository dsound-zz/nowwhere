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
    let isNewAnonymousUser = false
    
    // FR-5 & FR-11: If user is not authenticated and provides "First L." name,
    // use proper Supabase anonymous sign-in
    if (!user && displayName && isAnonymousSignIn) {
      // Use Supabase's built-in anonymous auth
      // Note: This requires anonymous auth to be enabled in Supabase dashboard
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
      
      if (anonError) {
        console.error('Error signing in anonymously:', anonError)
        return NextResponse.json(
          { error: 'Failed to create anonymous session. Please ensure anonymous auth is enabled in Supabase.' },
          { status: 500 }
        )
      }
      
      if (anonData.user) {
        currentUserId = anonData.user.id
        isNewAnonymousUser = true
        
        // Update user metadata with display name
        await supabase.auth.updateUser({
          data: { 
            display_name: displayName,
            is_anonymous: true 
          }
        })
      }
    }
    
    // Create attendee record
    const attendeeData = {
      event_id: eventId,
      user_id: currentUserId,
      display_name: displayName
    }
    
    // Use service client if we created an anonymous user (to bypass RLS for insert)
    // Otherwise use regular client which has the user's session
    const clientToUse = isNewAnonymousUser ? createServiceClient() : supabase
    
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
      anonymous_user_id: isNewAnonymousUser ? currentUserId : undefined,
      is_new_anonymous: isNewAnonymousUser
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}