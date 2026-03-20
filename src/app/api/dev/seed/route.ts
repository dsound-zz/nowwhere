import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { SeedVenue } from '@/lib/event-generator'
import { generateEvent, generateAttendees, generateMessages } from '@/lib/event-generator'
import { fetchNearbyVenues } from '@/lib/foursquare'
import staticVenues from '@/data/seed-venues.json'

// Guard: only allow in development
function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

export async function POST(request: NextRequest) {
  // Safety check
  if (!isDevelopment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radiusM = parseFloat(searchParams.get('radius_m') || '1600')
    const count = parseInt(searchParams.get('count') || '10', 10)
    const source = searchParams.get('source') || 'foursquare'

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Step 1: Fetch venues
    let venues: SeedVenue[] = []
    let venueSource = 'static'

    if (source === 'foursquare' && process.env.FOURSQUARE_API_KEY) {
      try {
        venues = await fetchNearbyVenues(lat, lng, radiusM)
        venueSource = 'foursquare'
      } catch (error) {
        console.error('Foursquare fetch failed, falling back to static venues:', error)
        venues = staticVenues as SeedVenue[]
      }
    } else {
      venues = staticVenues as SeedVenue[]
    }

    // Filter venues by distance from user location
    const filteredVenues = venues.filter(venue => {
      const dx = venue.lng - lng
      const dy = venue.lat - lat
      const distanceM = Math.sqrt(dx * dx + dy * dy) * 111000 // Approximate conversion
      return distanceM <= radiusM
    })

    // Limit to requested count
    const selectedVenues = filteredVenues.slice(0, Math.min(count, filteredVenues.length))

    if (selectedVenues.length === 0) {
      return NextResponse.json(
        { error: 'No venues found in the specified area' },
        { status: 404 }
      )
    }

    // Step 2: Upsert venues to database
    const venueRecords = selectedVenues.map(venue => ({
      name: venue.name,
      email: `${venue.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@seed.nowhere.app`,
      address: venue.address,
      location: `SRID=4326;POINT(${venue.lng} ${venue.lat})`,
      category: venue.category,
      vibe_tags: venue.vibe_tags,
      verified: true,
      description: venue.description || null,
      hours: venue.hours || null,
      phone: venue.phone || null,
      website: venue.website || null,
      rating: venue.rating || null,
    }))

    const { data: upsertedVenues, error: venueError } = await supabase
      .from('venues')
      .upsert(venueRecords, {
        onConflict: 'email',
        ignoreDuplicates: false,
      })
      .select('id, name, location, category')

    if (venueError) {
      console.error('Venue upsert error:', venueError)
      return NextResponse.json(
        { error: 'Failed to create venues', details: venueError.message },
        { status: 500 }
      )
    }

    // Step 3: Generate and insert events
    const eventsToInsert = []
    const attendeesToInsert = []
    const messagesToInsert = []

    for (let i = 0; i < selectedVenues.length; i++) {
      const venue = selectedVenues[i]
      const venueRecord = upsertedVenues?.[i]

      if (!venueRecord) continue

      // Generate 1-2 events per venue
      const numEvents = Math.random() < 0.7 ? 1 : 2

      for (let j = 0; j < numEvents; j++) {
        const event = generateEvent(venue)
        const eventId = `seed-${Date.now()}-${i}-${j}`

        eventsToInsert.push({
          id: eventId,
          venue_id: venueRecord.id,
          title: event.title,
          description: event.description,
          emoji: event.emoji,
          category: event.category,
          tags: event.tags,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          price_label: event.price_label,
          location: venueRecord.location,
          address: venue.address,
          status: 'live',
          source: 'seed',
        })

        // Generate attendees
        const attendees = generateAttendees(event.starts_at)
        const attendeeIdMap = new Map<string, string>()
        
        for (const attendee of attendees) {
          const attendeeId = `seed-attendee-${Date.now()}-${i}-${j}-${Math.random()}`
          attendeesToInsert.push({
            id: attendeeId,
            event_id: eventId,
            display_name: attendee.display_name,
          })
          
          // Map display name to ID for message generation
          attendeeIdMap.set(attendee.display_name, attendeeId)
        }

        // Generate messages
        const messages = generateMessages(attendees, event.starts_at)
        for (const message of messages) {
          const attendeeId = attendeeIdMap.get(message.display_name)
          if (attendeeId) {
            messagesToInsert.push({
              event_id: eventId,
              attendee_id: attendeeId,
              display_name: message.display_name,
              body: message.body,
              created_at: message.created_at,
            })
          }
        }
      }
    }

    // Insert events
    const { error: eventError } = await supabase
      .from('events')
      .insert(eventsToInsert)

    if (eventError) {
      console.error('Event insert error:', eventError)
      return NextResponse.json(
        { error: 'Failed to create events', details: eventError.message },
        { status: 500 }
      )
    }

    // Insert attendees
    if (attendeesToInsert.length > 0) {
      const { error: attendeeError } = await supabase
        .from('attendees')
        .insert(attendeesToInsert)

      if (attendeeError) {
        console.error('Attendee insert error:', attendeeError)
        // Non-fatal, continue
      }
    }

    // Insert messages
    if (messagesToInsert.length > 0) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert(messagesToInsert)

      if (messageError) {
        console.error('Message insert error:', messageError)
        // Non-fatal, continue
      }
    }

    return NextResponse.json({
      success: true,
      venue_source: venueSource,
      venues_created: upsertedVenues?.length || 0,
      events_created: eventsToInsert.length,
      attendees_created: attendeesToInsert.length,
      messages_created: messagesToInsert.length,
      location: { lat, lng, radius_m: radiusM },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
