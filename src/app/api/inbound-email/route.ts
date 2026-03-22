import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

interface InboundEmail {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
}

// System prompt for AI event extraction
const SYSTEM_PROMPT = `You are an event data extractor for NowHere, a local events app. 
Extract structured event information from venue emails.
Always respond with valid JSON only — no preamble, no markdown.

If a field cannot be determined, use null.
For starts_at and ends_at, output ISO 8601. 
Infer the year from context (assume upcoming, not past).
For price_label: 'Free' if free, '$X' if fixed price, '$' if cheap, '$$' if moderate.
For category choose one of: music, food, art, sport, social, other.
For tags, extract up to 5 short descriptive tags (e.g. 'jazz', 'late night', 'outdoor').
For emoji, choose a single emoji that best represents the event.

Output format:
{
  "title": string,
  "description": string (max 120 chars, punchy),
  "emoji": string,
  "category": string,
  "tags": string[],
  "starts_at": string (ISO 8601) | null,
  "ends_at": string (ISO 8601) | null,
  "price_label": string,
  "address": string | null,
  "confidence": number (0-1, your confidence in the extraction)
}`

async function parseEmailWithAI(fromAddress: string, subject: string, body: string, defaultAddress?: string | null) {
  const apiKey = process.env.TOGETHER_AI_API_KEY

  if (!apiKey) {
    console.warn('Together AI API key not configured, using fallback parsing')
    return fallbackParse(subject, body, defaultAddress)
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `From: ${fromAddress}\nSubject: ${subject}\nBody: ${body}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content from AI')
    }

    // Parse the JSON response
    const parsed = JSON.parse(content)
    if (!parsed.address && defaultAddress) {
      parsed.address = defaultAddress
    }
    return parsed
  } catch (error) {
    console.error('AI parsing error:', error)
    return fallbackParse(subject, body, defaultAddress)
  }
}

function fallbackParse(subject: string, body: string, defaultAddress: string | null | undefined = null) {
  // Simple fallback parsing when AI is not available
  const categoryKeywords: Record<string, string[]> = {
    music: ['music', 'concert', 'dj', 'jazz', 'band', 'live', 'open mic'],
    food: ['food', 'taco', 'ramen', 'dinner', 'brunch', 'tasting', 'crawl'],
    art: ['art', 'gallery', 'painting', 'workshop', 'creative', 'studio'],
    sport: ['sport', 'basketball', 'soccer', 'yoga', 'run', 'pickup'],
    social: ['trivia', 'meetup', 'social', 'networking', 'party'],
  }

  const combinedText = `${subject} ${body}`.toLowerCase()
  let category = 'social'

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => combinedText.includes(kw))) {
      category = cat
      break
    }
  }

  return {
    title: subject.substring(0, 60),
    description: body.substring(0, 120),
    emoji: '📍',
    category,
    tags: [],
    starts_at: null,
    ends_at: null,
    price_label: 'Free',
    address: defaultAddress,
    confidence: 0.3,
  }
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