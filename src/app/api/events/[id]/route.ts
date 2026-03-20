import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET: Get single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = createServiceClient()
    
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
    
    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ event })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update event (for venue owners/editors)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    
    const body = await request.json()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the event to check ownership
    const { data: event } = await serviceClient
      .from('events')
      .select('id, venue_id')
      .eq('id', eventId)
      .single()
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Check if user owns the venue (via RPC)
    const { data: ownsVenue } = await supabase.rpc('user_owns_venue', {
      check_venue_id: event.venue_id
    })
    
    if (!ownsVenue) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this event' },
        { status: 403 }
      )
    }
    
    // Update event
    const updateData: Record<string, unknown> = {}
    const allowedFields = ['title', 'description', 'category', 'starts_at', 'ends_at', 'price_label', 'emoji', 'status']
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
    const { data: updatedEvent, error } = await serviceClient
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      event: updatedEvent,
      message: 'Event updated successfully'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete event (for venue owners/editors)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the event to check ownership
    const { data: event } = await serviceClient
      .from('events')
      .select('id, venue_id')
      .eq('id', eventId)
      .single()
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Check if user owns the venue (via RPC)
    const { data: ownsVenue } = await supabase.rpc('user_owns_venue', {
      check_venue_id: event.venue_id
    })
    
    if (!ownsVenue) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this event' },
        { status: 403 }
      )
    }
    
    // Delete event
    const { error } = await serviceClient
      .from('events')
      .delete()
      .eq('id', eventId)
    
    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}