import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params
    const supabase = createServiceClient()

    // Get the email queue item
    const { data: emailQueue, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', emailId)
      .single()

    if (fetchError || !emailQueue) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    const queueItem = emailQueue as Record<string, unknown>

    if (queueItem.status !== 'pending') {
      console.error(`[approve] Email ${emailId} has status '${queueItem.status}', expected 'pending'`)
      return NextResponse.json(
        { error: `Email already processed (status: ${queueItem.status})` },
        { status: 400 }
      )
    }

    const parsedData = queueItem.parsed_data as {
      title?: string
      description?: string
      emoji?: string
      category?: string
      tags?: string[]
      starts_at?: string | null
      ends_at?: string | null
      price_label?: string
      address?: string | null
      confidence?: number
    } | null

    if (!parsedData || !parsedData.title) {
      return NextResponse.json(
        { error: 'No parsed data available' },
        { status: 400 }
      )
    }

    let venueId = queueItem.matched_venue_id as string | null

    // If no matched venue, check if venue exists or create a new one
    if (!venueId) {
      const fromAddress = queueItem.from_address as string
      
      // First, check if a venue with this email already exists
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id')
        .eq('email', fromAddress.toLowerCase())
        .single()

      if (existingVenue) {
        venueId = (existingVenue as Record<string, unknown>).id as string
        console.log('[approve] Found existing venue for email:', { venueId, email: fromAddress })
      } else {
        console.log('[approve] No venue found, creating new venue from email')
        
        // Extract venue name from email (e.g., "events@babysallright.com" -> "Baby's All Right")
        let venueName = fromAddress.split('@')[0]
          .replace(/events|info|hello|contact/gi, '')
          .replace(/[._-]/g, ' ')
          .trim()
        
        // Capitalize words
        venueName = venueName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ') || 'Unknown Venue'

        const venueAddress = parsedData.address || null
        
        // Try to geocode the address if available
        let location = null
        if (venueAddress && process.env.MAPBOX_API_KEY) {
          try {
            const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(venueAddress)}.json?access_token=${process.env.MAPBOX_API_KEY}&limit=1`
            const geoResponse = await fetch(geocodeUrl)
            
            if (geoResponse.ok) {
              const geoData = await geoResponse.json()
              if (geoData.features && geoData.features.length > 0) {
                const [lng, lat] = geoData.features[0].center
                location = `POINT(${lng} ${lat})`
                console.log('[approve] Geocoded venue address:', { lat, lng })
              }
            }
          } catch (geoError) {
            console.error('[approve] Geocoding error:', geoError)
          }
        }

        // Create the new venue
        const { data: newVenue, error: venueError } = await supabase
          .from('venues')
          .insert({
            name: venueName,
            email: fromAddress.toLowerCase(),
            address: venueAddress,
            location: location,
            verified: false, // Auto-created venues are not verified
            category: parsedData.category || null,
          })
          .select('id')
          .single()

        if (venueError) {
          console.error('[approve] Error creating venue:', venueError)
          // Continue without venue - event can exist without a venue
        } else {
          venueId = (newVenue as Record<string, unknown>)?.id as string
          console.log('[approve] Created new venue:', { id: venueId, name: venueName })
        }
      }
    }

    // Check for duplicate events (same title, venue, and within 6 hours of starts_at)
    if (parsedData.starts_at && venueId) {
      const startsAt = new Date(parsedData.starts_at)
      const sixHoursBefore = new Date(startsAt.getTime() - 6 * 60 * 60 * 1000)
      const sixHoursAfter = new Date(startsAt.getTime() + 6 * 60 * 60 * 1000)

      const { data: duplicateEvent } = await supabase
        .from('events')
        .select('id, title')
        .eq('venue_id', venueId)
        .eq('title', parsedData.title)
        .gte('starts_at', sixHoursBefore.toISOString())
        .lte('starts_at', sixHoursAfter.toISOString())
        .limit(1)
        .single()

      if (duplicateEvent) {
        console.log('[approve] Duplicate event detected:', duplicateEvent)
        
        // Still mark email as approved but don't create event
        await supabase
          .from('email_queue')
          .update({
            status: 'approved',
            admin_outcome: 'approved',
            outcome_at: new Date().toISOString()
          })
          .eq('id', emailId)

        return NextResponse.json({
          success: true,
          duplicate: true,
          existing_event_id: (duplicateEvent as Record<string, unknown>).id,
          message: 'Duplicate event detected - email approved but no new event created',
        })
      }
    }

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        venue_id: venueId,
        title: parsedData.title,
        description: parsedData.description || null,
        emoji: parsedData.emoji || '📍',
        category: parsedData.category || null,
        tags: parsedData.tags || null,
        starts_at: parsedData.starts_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        ends_at: parsedData.ends_at || null,
        price_label: parsedData.price_label || 'Free',
        address: parsedData.address || null,
        status: 'live',
        source: 'email',
        raw_email_id: emailId,
      })
      .select('id')
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    // Update email queue status with admin outcome tracking
    await supabase
      .from('email_queue')
      .update({
        status: 'approved',
        admin_outcome: 'approved',
        outcome_at: new Date().toISOString()
      })
      .eq('id', emailId)

    const eventRecord = event as Record<string, unknown>

    return NextResponse.json({
      success: true,
      event_id: eventRecord?.id,
      message: 'Event created and email approved',
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}