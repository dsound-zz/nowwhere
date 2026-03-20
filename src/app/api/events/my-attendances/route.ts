import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ attendances: [] })
    }
    
    // Fetch all attendances for the current user with event details
    const { data: attendees, error } = await supabase
      .from('attendees')
      .select(`
        id,
        event_id,
        display_name,
        joined_at,
        events (
          id,
          title,
          emoji,
          status
        )
      `)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching attendances:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendances' },
        { status: 500 }
      )
    }
    
    // Transform to a map of event_id -> attendee info
    const attendances = (attendees || []).map((a) => ({
      attendee_id: a.id,
      event_id: a.event_id,
      display_name: a.display_name,
      joined_at: a.joined_at,
      event_status: a.events?.status
    }))
    
    return NextResponse.json({ attendances })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}