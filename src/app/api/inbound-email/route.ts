import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { extractEventWithAI, fallbackParse } from '@/lib/ai'

interface InboundEmail {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
}

async function parseEmailWithAI(fromAddress: string, subject: string, body: string, defaultAddress?: string | null) {
  const extracted = await extractEventWithAI(
    `From: ${fromAddress}\nSubject: ${subject}\nBody: ${body}`
  )

  if (!extracted) {
    return fallbackParse(subject, body, defaultAddress)
  }

  // Fill in default address if missing
  if (!extracted.address && defaultAddress) {
    extracted.address = defaultAddress
  }

  return extracted
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let from = ''
    let subject = ''
    let text = ''
    let html = ''

    // Handle Resend webhook format
    if (body.type === 'email.received') {
      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) {
        return NextResponse.json(
          { error: 'RESEND_API_KEY is not configured' },
          { status: 500 }
        )
      }

      const resend = new Resend(resendApiKey)
      const { data: email, error: fetchError } = await resend.emails.receiving.get(
        body.data.email_id
      )

      if (fetchError || !email) {
        console.error('Failed to fetch from Resend:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch email from Resend' },
          { status: 500 }
        )
      }

      // Extract email from "Name <email@example.com>" format
      const emailMatch = email.from.match(/<([^>]+)>/)
      from = emailMatch ? emailMatch[1] : email.from
      subject = email.subject || ''
      text = email.text || ''
      html = email.html || ''
    } else {
      // Handle fallback/legacy generic format
      const emailBody = body as InboundEmail
      from = emailBody.from || ''
      subject = emailBody.subject || ''
      text = emailBody.text || ''
      html = emailBody.html || ''
    }

    if (!from) {
      return NextResponse.json(
        { error: 'Missing "from" field' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Try to match the email to a verified venue
    const { data: venue } = await supabase
      .from('venues')
      .select('id, email, address')
      .eq('email', from.toLowerCase())
      .eq('verified', true)
      .single()

    // Parse the email with AI
    const parsedData = await parseEmailWithAI(
      from,
      subject,
      text || html,
      venue?.address
    )

    // Geocode the address
    let geocodedLocation: string | undefined = undefined
    if (parsedData?.address) {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (mapboxToken) {
        try {
          const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(parsedData.address)}&access_token=${mapboxToken}&limit=1`)
          if (res.ok) {
            const geocodeData = await res.json()
            if (geocodeData.features && geocodeData.features.length > 0) {
              const coords = geocodeData.features[0].geometry.coordinates
              // Mapbox returns [longitude, latitude], match PostGIS Longitude first rule
              const lng = coords[0]
              const lat = coords[1]
              geocodedLocation = `SRID=4326;POINT(${lng} ${lat})`
            }
          }
        } catch (e) {
          console.error('Geocoding error:', e)
        }
      }
    }

    let matchedVenueId = venue?.id

    // If no existing venue but we generated a location, suggest a new unverified venue
    if (!matchedVenueId && parsedData?.address) {
      const { data: newVenue, error: newVenueError } = await supabase
        .from('venues')
        .insert({
          name: parsedData.title || from.split('@')[0],
          email: from.toLowerCase(),
          verified: false,
          address: parsedData.address,
          ...(geocodedLocation ? { location: geocodedLocation } : {})
        })
        .select('id')
        .single()
      
      if (!newVenueError && newVenue) {
        matchedVenueId = newVenue.id
      }
    }

    const queuePayload: any = {
      from_address: from,
      subject: subject || null,
      body_text: text || null,
      body_html: html || null,
      parsed_data: parsedData,
      matched_venue_id: matchedVenueId || null,
      status: matchedVenueId ? 'pending' : 'pending',
    }

    // Insert location using EWKT string which Supabase mapping converts into ST_SetSRID(ST_MakePoint(...), 4326)
    if (geocodedLocation) {
      queuePayload.location = geocodedLocation
    }

    // Save to email queue
    const { data: emailQueue, error } = await supabase
      .from('email_queue')
      .insert(queuePayload)
      .select('id')
      .single()

    if (error) {
      console.error('Error saving email to queue:', error)
      return NextResponse.json(
        { error: 'Failed to process email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: emailQueue?.id,
      matched_venue: venue ? true : false,
      parsed_data: parsedData,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// INSERT INTO venues (name, email, verified, location)
// VALUES (
//   'Venue Name', 
//   'email@venue.com', 
//   true, 
//   ST_SetSRID(ST_MakePoint(LONGITUDE, LATITUDE), 4326)::geography
// );