import { NextRequest, NextResponse } from 'next/server'

// Foursquare Places API search endpoint
// FR-16: Admin can search for venues to import

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const lat = searchParams.get('lat') || '40.7231' // Default to NYC
    const lng = searchParams.get('lng') || '-73.9873'
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }
    
    const apiKey = process.env.FOURSQUARE_API_KEY
    
    if (!apiKey) {
      // Return mock results if no API key (for development)
      return NextResponse.json({
        results: getMockResults(query),
        source: 'mock'
      })
    }
    
    // Search Foursquare Places API
    const url = new URL('https://api.foursquare.com/v3/places/search')
    url.searchParams.set('query', query)
    url.searchParams.set('ll', `${lat},${lng}`)
    url.searchParams.set('radius', '10000') // 10km radius
    url.searchParams.set('limit', '10')
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': apiKey
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Foursquare API error:', errorData)
      return NextResponse.json(
        { error: 'Foursquare search failed', details: errorData },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Transform results to our format
    const results = (data.results || []).map((place: any) => ({
      fsq_id: place.fsq_id,
      name: place.name,
      location: {
        address: place.location?.address,
        formatted_address: place.location?.formatted_address
      },
      geocodes: {
        main: {
          latitude: place.geocodes?.main?.latitude || 0,
          longitude: place.geocodes?.main?.longitude || 0
        }
      },
      categories: (place.categories || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name
      }))
    }))
    
    return NextResponse.json({
      results,
      source: 'foursquare',
      count: results.length
    })
  } catch (err) {
    console.error('Foursquare search error:', err)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

// Mock results for development without API key
function getMockResults(query: string) {
  const mockVenues = [
    {
      fsq_id: 'mock_1',
      name: `${query} Venue 1`,
      location: {
        address: '123 Main St',
        formatted_address: '123 Main St, New York, NY'
      },
      geocodes: {
        main: { latitude: 40.7200, longitude: -73.9900 }
      },
      categories: [{ id: 10032, name: 'Night Club' }]
    },
    {
      fsq_id: 'mock_2',
      name: `${query} Venue 2`,
      location: {
        address: '456 Oak Ave',
        formatted_address: '456 Oak Ave, Brooklyn, NY'
      },
      geocodes: {
        main: { latitude: 40.7250, longitude: -73.9850 }
      },
      categories: [{ id: 13065, name: 'Restaurant' }]
    },
    {
      fsq_id: 'mock_3',
      name: `${query} Bar`,
      location: {
        address: '789 Cedar Ln',
        formatted_address: '789 Cedar Ln, Manhattan, NY'
      },
      geocodes: {
        main: { latitude: 40.7180, longitude: -73.9920 }
      },
      categories: [{ id: 13003, name: 'Bar' }]
    }
  ]
  
  return mockVenues
}