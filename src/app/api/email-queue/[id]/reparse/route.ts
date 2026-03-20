import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// FR-12: Re-parse endpoint for failed email parsing with "strict" instruction
// Uses Llama 3.3 70B via Together AI with enhanced extraction rules

interface ParsedEmailData {
  title?: string
  description?: string
  category?: string
  emoji?: string
  starts_at?: string
  ends_at?: string
  price_label?: string
  location?: string
  parse_error?: boolean
  strict_mode?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params
    const supabase = createServiceClient()

    // Get optional strict mode from body
    let strictMode = true
    try {
      const body = await request.json()
      strictMode = body.strict !== false
    } catch {
      // Default to strict mode
    }

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
      return NextResponse.json(
        { error: 'Email already processed' },
        { status: 400 }
      )
    }

    // Extract email content for parsing
    const subject = queueItem.subject as string | null
    const bodyText = queueItem.body_text as string | null
    const bodyHtml = queueItem.body_html as string | null
    const fromAddress = queueItem.from_address as string

    // Use Together AI to re-parse the email with strict instructions
    const parsedData = await parseEmailWithAI(
      subject || '',
      bodyText || bodyHtml || '',
      fromAddress,
      strictMode
    )

    // Update the email queue with new parsed data
    const { error: updateError } = await supabase
      .from('email_queue')
      .update({
        parsed_data: {
          ...parsedData,
          strict_mode: strictMode,
          reparsed_at: new Date().toISOString()
        }
      })
      .eq('id', emailId)

    if (updateError) {
      console.error('Error updating email queue:', updateError)
      return NextResponse.json(
        { error: 'Failed to update parsed data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      parsed_data: parsedData,
      message: strictMode ? 'Email re-parsed with strict mode' : 'Email re-parsed'
    })
  } catch (err) {
    console.error('Unexpected error during re-parse:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Parse email using Together AI (Llama 3.3 70B)
async function parseEmailWithAI(
  subject: string,
  body: string,
  fromAddress: string,
  strictMode: boolean
): Promise<ParsedEmailData> {
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY
  
  if (!TOGETHER_API_KEY) {
    console.warn('TOGETHER_API_KEY not set, returning fallback parse')
    return getFallbackParse(subject, body, fromAddress)
  }

  const strictInstructions = strictMode
    ? `STRICT PARSING RULES:
- Only extract information that is EXPLICITLY stated in the email
- If a field cannot be determined with high confidence, leave it null
- Dates must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- Categories must be one of: music, food, art, sport, social
- Price must be extracted exactly as written (e.g., "Free", "$15", "$20-30")
- Do NOT hallucinate or guess any information
- If the event title is unclear, use the subject line
- Mark parse_error: true if critical information is missing`
    : ''

  const prompt = `You are an event email parser. Extract structured event data from the following email.

${strictInstructions}

From: ${fromAddress}
Subject: ${subject}

Email Body:
${body.substring(0, 4000)}

Respond with a JSON object containing these fields:
{
  "title": "Event title (required)",
  "description": "Brief description of the event",
  "category": "One of: music, food, art, sport, social",
  "emoji": "A single emoji representing the event",
  "starts_at": "ISO 8601 datetime or null",
  "ends_at": "ISO 8601 datetime or null", 
  "price_label": "Price as written (Free, $15, etc)",
  "location": "Venue or address",
  "parse_error": false
}

Only respond with the JSON object, no additional text.`

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a precise event data extraction system. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      console.error('Together AI API error:', await response.text())
      return getFallbackParse(subject, body, fromAddress)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content as string
    
    if (!content) {
      return getFallbackParse(subject, body, fromAddress)
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return getFallbackParse(subject, body, fromAddress)
      }
      
      const parsed = JSON.parse(jsonMatch[0]) as ParsedEmailData
      return {
        ...parsed,
        parse_error: !parsed.title || !parsed.starts_at
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return getFallbackParse(subject, body, fromAddress)
    }
  } catch (error) {
    console.error('Error calling Together AI:', error)
    return getFallbackParse(subject, body, fromAddress)
  }
}

// Fallback parser when AI is unavailable
function getFallbackParse(
  subject: string,
  body: string,
  fromAddress: string
): ParsedEmailData {
  // Simple rule-based extraction
  const categoryKeywords: Record<string, string[]> = {
    music: ['concert', 'live music', 'dj', 'band', 'jazz', 'rock', 'show', 'performance'],
    food: ['tasting', 'dinner', 'brunch', 'food', 'chef', 'menu', 'wine', 'beer'],
    art: ['exhibition', 'gallery', 'art', 'opening', 'show', 'museum'],
    sport: ['game', 'match', 'tournament', 'sport', 'fitness', 'run', 'yoga'],
    social: ['party', 'meetup', 'networking', 'happy hour', 'social'],
  }

  // Detect category from content
  const content = `${subject} ${body}`.toLowerCase()
  let detectedCategory = 'social'
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => content.includes(kw))) {
      detectedCategory = category
      break
    }
  }

  // Category to emoji mapping
  const categoryEmojis: Record<string, string> = {
    music: '🎵',
    food: '🍽️',
    art: '🎨',
    sport: '🏀',
    social: '🎉',
  }

  return {
    title: subject || 'Untitled Event',
    description: body.substring(0, 200),
    category: detectedCategory,
    emoji: categoryEmojis[detectedCategory] || '📍',
    price_label: content.includes('free') ? 'Free' : 'See details',
    parse_error: true,
  }
}