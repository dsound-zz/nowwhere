import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

async function parseEmailWithAI(fromAddress: string, subject: string, body: string) {
  const apiKey = process.env.TOGETHER_AI_API_KEY
  
  if (!apiKey) {
    console.warn('Together AI API key not configured, using fallback parsing')
    return fallbackParse(subject, body)
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
    return JSON.parse(content)
  } catch (error) {
    console.error('AI parsing error:', error)
    return fallbackParse(subject, body)
  }
}

function fallbackParse(subject: string, body: string) {
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
    address: null,
    confidence: 0.3,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as InboundEmail

    const { from, subject, text, html } = body

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
      .select('id, email')
      .eq('email', from.toLowerCase())
      .eq('verified', true)
      .single()

    // Parse the email with AI
    const parsedData = await parseEmailWithAI(
      from,
      subject || '',
      text || html || ''
    )

    // Save to email queue
    const { data: emailQueue, error } = await supabase
      .from('email_queue')
      .insert({
        from_address: from,
        subject: subject || null,
        body_text: text || null,
        body_html: html || null,
        parsed_data: parsedData,
        matched_venue_id: venue?.id || null,
        status: venue ? 'pending' : 'pending', // Both go to review queue
      })
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