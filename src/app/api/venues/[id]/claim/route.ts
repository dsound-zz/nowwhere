import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Claim Venue API - Sends magic link to venue email
// This allows venue owners to authenticate and manage their venue

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    
    // Get the venue
    const { data: venue, error: venueError } = await serviceClient
      .from('venues')
      .select('id, name, email')
      .eq('id', venueId)
      .single()
    
    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }
    
    // Check if venue has a real email (not placeholder)
    if (!venue.email || venue.email.includes('placeholder')) {
      return NextResponse.json(
        { error: 'This venue does not have a registered email address' },
        { status: 400 }
      )
    }
    
    // Send magic link to venue email
    // The redirect URL will take them to a venue management page
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: venue.email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/venues/${venueId}/manage`,
        data: {
          claiming_venue_id: venueId,
          claiming_venue_name: venue.name,
          is_venue_owner: true
        }
      }
    })
    
    if (authError) {
      console.error('Error sending magic link:', authError)
      return NextResponse.json(
        { error: 'Failed to send magic link. Please try again.' },
        { status: 500 }
      )
    }
    
    // Log the claim attempt
    console.log(`Venue claim initiated: ${venue.name} (${venue.email})`)
    
    return NextResponse.json({
      success: true,
      message: `Magic link sent to ${venue.email}`,
      venue_name: venue.name
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}