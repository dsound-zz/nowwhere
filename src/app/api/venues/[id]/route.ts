import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: venueId } = await params

    // Fetch venue details with coordinates extracted using PostGIS
    const { data: venue, error } = await supabase
      .rpc('get_venue_by_id', { venue_id: venueId })
      .single()

    if (error) {
      console.error('Error fetching venue:', error)
      // Fallback: try direct query
      const { data: fallbackVenue, error: fallbackError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single()
      
      if (fallbackError || !fallbackVenue) {
        return NextResponse.json(
          { error: 'Venue not found' },
          { status: 404 }
        )
      }
      
      // Return venue without coordinates (map won't fly but details will show)
      return NextResponse.json({
        id: fallbackVenue.id,
        name: fallbackVenue.name,
        address: fallbackVenue.address,
        lat: null,
        lng: null,
        category: fallbackVenue.category,
        vibe_tags: fallbackVenue.vibe_tags || [],
        description: fallbackVenue.description,
        hours: fallbackVenue.hours,
        phone: fallbackVenue.phone,
        website: fallbackVenue.website,
        rating: fallbackVenue.rating,
        email: fallbackVenue.email,
        activeEvents: 0,
      })
    }

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }

    // Get active events count for this venue
    const { count: activeEventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('status', 'live')

    const venueDetail = {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      category: venue.category,
      vibe_tags: venue.vibe_tags || [],
      description: venue.description,
      hours: venue.hours,
      phone: venue.phone,
      website: venue.website,
      rating: venue.rating,
      email: venue.email,
      activeEvents: activeEventsCount || 0,
    }

    return NextResponse.json(venueDetail)
  } catch (error) {
    console.error('Error in venue detail API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}