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
      console.error('Error fetching venue via RPC, trying fallback:', error)
      
      // Fallback: use PostGIS functions in a raw query to extract coordinates
      const { data: fallbackVenue, error: fallbackError } = await supabase
        .rpc('get_venue_coords_by_id', { venue_id: venueId })
        .maybeSingle()
      
      if (fallbackError) {
        console.error('Fallback RPC also failed:', fallbackError)
      }
      
      if (fallbackVenue) {
        // Successfully got venue with coords via fallback function
        const { count: activeEventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', venueId)
          .eq('status', 'live')

        return NextResponse.json({
          id: fallbackVenue.id,
          name: fallbackVenue.name,
          address: fallbackVenue.address,
          lat: fallbackVenue.lat,
          lng: fallbackVenue.lng,
          category: fallbackVenue.category,
          vibe_tags: fallbackVenue.vibe_tags || [],
          description: fallbackVenue.description,
          hours: fallbackVenue.hours,
          phone: fallbackVenue.phone,
          website: fallbackVenue.website,
          rating: fallbackVenue.rating,
          email: fallbackVenue.email,
          activeEvents: activeEventsCount || 0,
        })
      }
      
      // Last resort: direct query without coordinates (map won't work but details will show)
      const { data: basicVenue, error: basicError } = await supabase
        .from('venues')
        .select('id, name, address, category, vibe_tags, description, hours, phone, website, rating, email')
        .eq('id', venueId)
        .single()
      
      if (basicError || !basicVenue) {
        return NextResponse.json(
          { error: 'Venue not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        ...basicVenue,
        lat: null,
        lng: null,
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