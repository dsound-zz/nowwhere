import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST: Create event manually (Quick Add)
// FR-16: Admin/Venue Owner can create events manually

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const {
      venue_id,
      title,
      description,
      category,
      starts_at,
      ends_at,
      price_label,
      emoji,
      tags,
      source = 'manual'
    } = body
    
    if (!title || !starts_at) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      )
    }
    
    // If venue_id provided, check user owns the venue or is admin
    if (venue_id && user) {
      const { data: venue } = await supabase
        .from('venues')
        .select('id, name')
        .eq('id', venue_id)
        .single()
      
      if (!venue) {
        return NextResponse.json(
          { error: 'Venue not found' },
          { status: 404 }
        )
      }
      
      // TODO: Add venue_owners table check
      // For now, allow any authenticated user to create events
    }
    
    // Determine event location from venue
    let locationData = null
    let address = null
    
    if (venue_id) {
      const serviceClient = createServiceClient()
      const { data: venueWithLocation } = await serviceClient
        .from('venues')
        .select('location, address')
        .eq('id', venue_id)
        .single()
      
      locationData = venueWithLocation?.location
      address = venueWithLocation?.address
    }
    
    // Create event
    const insertData = {
      venue_id: venue_id || null,
      title,
      description: description || null,
      category: category || 'social',
      starts_at,
      ends_at: ends_at || null,
      price_label: price_label || 'Free',
      emoji: emoji || '🎤',
      tags: tags || [],
      location: locationData,
      address,
      status: 'live' as const, // Manual events go live immediately
      source
    }
    
    // Use service client to bypass RLS for event creation
    const serviceClient = createServiceClient()
    const { data: event, error } = await serviceClient
      .from('events')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      event,
      message: 'Event created successfully'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List events with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const searchParams = request.nextUrl.searchParams
    const venueId = searchParams.get('venue_id')
    const status = searchParams.get('status') || 'live'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    
    let query = supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true })
      .limit(limit)
    
    if (venueId) {
      query = query.eq('venue_id', venueId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: events, error } = await query
    
    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      events,
      count: events?.length || 0
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}