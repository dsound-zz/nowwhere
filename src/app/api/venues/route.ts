import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST: Import venue from Foursquare or create manually
// FR-16: Admin can import venues from Foursquare API

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServiceClient()
    
    const { name, address, latitude, longitude, category, fsq_id, email, phone, website, description, hours } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Venue name is required' },
        { status: 400 }
      )
    }
    
    // Check if venue already exists (by name or fsq_id)
    const existingQuery = supabase
      .from('venues')
      .select('id, name')
      .eq('name', name)
    
    if (fsq_id) {
      // Check by fsq_id if provided
      const { data: existingByFsq } = await supabase
        .from('venues')
        .select('id, name')
        .eq('fsq_id', fsq_id)
        .single()
      
      if (existingByFsq) {
        return NextResponse.json(
          { error: 'Venue already imported', venue: existingByFsq },
          { status: 409 }
        )
      }
    }
    
    const { data: existing } = await existingQuery.single()
    
    if (existing) {
      return NextResponse.json(
        { error: 'Venue with this name already exists', venue: existing },
        { status: 409 }
      )
    }
    
    // Create PostGIS point from lat/lng
    const locationPoint = latitude && longitude 
      ? `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`
      : null
    
    // Insert venue
    const insertData: Record<string, unknown> = {
      name,
      email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@venue.placeholder`,
      address: address || null,
      category: category || null,
      phone: phone || null,
      website: website || null,
      description: description || null,
      hours: hours || null,
      verified: false
    }
    
    // Add fsq_id if provided (need to alter table first)
    if (fsq_id) {
      insertData.fsq_id = fsq_id
    }
    
    // Use raw query to set location with PostGIS
    const { data: venue, error } = await supabase
      .from('venues')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating venue:', error)
      
      // If error is about fsq_id column, try without it
      if (error.message?.includes('fsq_id')) {
        delete insertData.fsq_id
        const { data: venueRetry, error: errorRetry } = await supabase
          .from('venues')
          .insert(insertData)
          .select()
          .single()
        
        if (errorRetry) {
          return NextResponse.json(
            { error: 'Failed to create venue' },
            { status: 500 }
          )
        }
        
        return NextResponse.json({ venue: venueRetry, message: 'Venue created successfully' })
      }
      
      return NextResponse.json(
        { error: 'Failed to create venue' },
        { status: 500 }
      )
    }
    
    // Update location with PostGIS if coordinates provided
    if (latitude && longitude && venue) {
      await supabase.rpc('update_venue_location', {
        venue_id: venue.id,
        lat: latitude,
        lng: longitude
      }).catch(() => {
        // Ignore if function doesn't exist
        console.log('Note: update_venue_location function not available')
      })
    }
    
    return NextResponse.json({
      venue,
      message: 'Venue created successfully'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List all venues
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const verified = searchParams.get('verified')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    
    let query = supabase
      .from('venues')
      .select('*')
      .order('name')
      .limit(limit)
    
    if (category) {
      query = query.eq('category', category)
    }
    
    if (verified !== null) {
      query = query.eq('verified', verified === 'true')
    }
    
    const { data: venues, error } = await query
    
    if (error) {
      console.error('Error fetching venues:', error)
      return NextResponse.json(
        { error: 'Failed to fetch venues' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      venues,
      count: venues?.length || 0
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}