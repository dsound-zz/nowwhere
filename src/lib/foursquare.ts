// Foursquare Places API integration for fetching real venues
import type { SeedVenue } from './event-generator'

interface FoursquarePlaceResponse {
  results: FoursquarePlace[]
}

interface FoursquarePlace {
  fsq_id: string
  name: string
  location: {
    address?: string
    locality?: string
    region?: string
    postcode?: string
    country?: string
    formatted_address?: string
  }
  geocodes: {
    main: {
      latitude: number
      longitude: number
    }
  }
  categories: Array<{
    id: number
    name: string
  }>
}

// Map Foursquare category IDs to NowHere categories
const categoryMapping: Record<number, 'music' | 'food' | 'art' | 'sport' | 'social'> = {
  // Music venues
  10032: 'music', // Night Club
  10039: 'music', // Music Venue
  10040: 'music', // Jazz Club
  10033: 'music', // Karaoke Bar
  
  // Food & Drink
  13003: 'food', // Bar
  13065: 'food', // Restaurant
  13034: 'food', // Café
  13035: 'food', // Coffee Shop
  13145: 'food', // Fast Food Restaurant
  13383: 'social', // Cocktail Bar
  13027: 'social', // Beer Bar
  13028: 'social', // Brewery
  
  // Art & Culture
  10004: 'art', // Art Gallery
  10024: 'art', // Museum
  10042: 'art', // Performing Arts Venue
  10043: 'art', // Theater
  
  // Sports & Recreation
  18000: 'sport', // Sports & Recreation
  18021: 'sport', // Gym
  18022: 'sport', // Gym / Fitness Center
  18032: 'sport', // Basketball Court
  18065: 'sport', // Park
  18046: 'sport', // Climbing Gym
  
  // Social
  10046: 'social', // Social Club
}

// Foursquare category IDs to search for each NowHere category
const categorySearchIds: Record<string, number[]> = {
  music: [10032, 10039, 10040, 10033], // Night Club, Music Venue, Jazz Club, Karaoke Bar
  food: [13003, 13065, 13034, 13035], // Bar, Restaurant, Café, Coffee Shop
  art: [10004, 10024, 10042, 10043], // Art Gallery, Museum, Performing Arts, Theater
  sport: [18000, 18032, 18065, 18046], // Sports & Recreation, Basketball Court, Park, Climbing Gym
  social: [13003, 13383, 13027, 13028], // Bar, Cocktail Bar, Beer Bar, Brewery
}

function generateVibeTags(place: FoursquarePlace, category: string): string[] {
  const tags: string[] = []
  
  // Add category-specific tags
  const categoryTags: Record<string, string[]> = {
    music: ['live music', 'nightlife', 'entertainment'],
    food: ['dining', 'drinks', 'casual'],
    art: ['cultural', 'creative', 'exhibitions'],
    sport: ['fitness', 'active', 'outdoor'],
    social: ['hangout', 'meetup', 'community'],
  }
  
  tags.push(...(categoryTags[category] || []))
  
  // Add first Foursquare category name if available
  if (place.categories[0]?.name) {
    const catName = place.categories[0].name.toLowerCase()
    tags.push(catName)
  }
  
  return tags.slice(0, 3)
}

function normalizePlace(place: FoursquarePlace): SeedVenue | null {
  const category = place.categories[0]?.id
    ? categoryMapping[place.categories[0].id] || 'social'
    : 'social'
  
  const address = place.location.formatted_address || 
    [place.location.address, place.location.locality, place.location.region]
      .filter(Boolean)
      .join(', ') ||
    'Address not available'
  
  return {
    name: place.name,
    address,
    lat: place.geocodes.main.latitude,
    lng: place.geocodes.main.longitude,
    category,
    vibe_tags: generateVibeTags(place, category),
  }
}

export async function fetchNearbyVenues(
  lat: number,
  lng: number,
  radiusM: number = 1600
): Promise<SeedVenue[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY
  
  if (!apiKey) {
    throw new Error('FOURSQUARE_API_KEY not configured')
  }
  
  // Combine all category IDs
  const allCategoryIds = [
    ...categorySearchIds.music,
    ...categorySearchIds.food,
    ...categorySearchIds.art,
    ...categorySearchIds.sport,
    ...categorySearchIds.social,
  ]
  const categoryParam = allCategoryIds.join(',')
  
  const url = new URL('https://api.foursquare.com/v3/places/search')
  url.searchParams.set('ll', `${lat},${lng}`)
  url.searchParams.set('radius', radiusM.toString())
  url.searchParams.set('categories', categoryParam)
  url.searchParams.set('limit', '50')
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`)
    }
    
    const data = await response.json() as FoursquarePlaceResponse
    
    const venues = data.results
      .map(place => normalizePlace(place))
      .filter((v): v is SeedVenue => v !== null)
    
    return venues
  } catch (error) {
    console.error('Foursquare API error:', error)
    throw error
  }
}
