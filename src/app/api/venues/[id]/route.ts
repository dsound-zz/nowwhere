import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()
    const venueId = params.id

    // Fetch venue details
    const { data: venue, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (error) {
      console.error('Error fetching venue:', error)
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }

    // Transform location to lat/lng
    let lat = null
    let lng = null
    if (venue.location) {
      // Parse PostGIS point format: "SRID=4326;POINT(lng lat)"
      const match = venue.location.match(/POINT\(([^ ]+) ([^)]+)\)/)
      if (match) {
        lng = parseFloat(match[1])
        lat = parseFloat(match[2])
      }
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
      lat,
      lng,
      category: venue.category,
      vibe_tags: venue.vibe_tags || [],
      description: venue.description,
      hours: venue.hours,
      phone: venue.phone,
      website: venue.website,
      rating: venue.rating,
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