import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface NearbyEvent {
  id: string
  venue_id: string | null
  title: string
  description: string | null
  emoji: string
  category: string | null
  tags: string[] | null
  starts_at: string
  ends_at: string | null
  price_label: string
  address: string | null
  status: string
  distance_m: number
  attendee_count: number
  venue_name?: string
  location_lat: number | null
  location_lng: number | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radiusM = parseFloat(searchParams.get('radius_m') || '1600') // Default ~1 mile
    const category = searchParams.get('category') || null
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call the PostGIS function for nearby events
    const { data, error } = await supabase.rpc('get_nearby_events', {
      lat,
      lng,
      radius_m: radiusM,
      filter_category: category,
      result_limit: limit
    })

    if (error) {
      console.error('Error fetching nearby events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Get venue names for events with venues
    const events = data as NearbyEvent[]
    const venueIds = events
      .filter((e) => e.venue_id)
      .map((e) => e.venue_id)

    let venueMap: Record<string, string> = {}
    if (venueIds.length > 0) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds)

      if (venues) {
        venueMap = venues.reduce((acc, v) => {
          acc[v.id] = v.name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Add venue names to events
    const eventsWithVenues = events.map((event) => ({
      ...event,
      venue_name: event.venue_id ? venueMap[event.venue_id] : null
    }))

    return NextResponse.json({
      events: eventsWithVenues,
      query: { lat, lng, radius_m: radiusM, category },
      count: eventsWithVenues.length
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}