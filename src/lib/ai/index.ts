/**
 * Shared AI utilities for LLM calls
 * All Together AI API calls should go through here
 */

import { EVENT_EXTRACTION_PROMPT } from './prompts'

interface TogetherAIResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

/**
 * Call Together AI's Llama 3.3 model for event extraction
 * @param userPrompt The user message to send
 * @returns Parsed event data or null on failure
 */
export async function extractEventWithAI(userPrompt: string): Promise<any | null> {
  const apiKey = process.env.TOGETHER_AI_API_KEY

  if (!apiKey) {
    console.warn('[ai] Together AI API key not configured')
    return null
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
          { role: 'system', content: EVENT_EXTRACTION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data: TogetherAIResponse = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content from AI')
    }

    // Parse the JSON response
    return JSON.parse(content)
  } catch (error) {
    console.error('[ai] Extraction error:', error)
    return null
  }
}

/**
 * Fallback parsing when AI is unavailable
 */
export function fallbackParse(subject: string, body: string, defaultAddress: string | null = null) {
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
