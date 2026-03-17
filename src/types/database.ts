export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      venues: {
        Row: {
          id: string
          name: string
          email: string
          address: string | null
          location: string | null
          category: string | null
          vibe_tags: string[] | null
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          address?: string | null
          location?: string | null
          category?: string | null
          vibe_tags?: string[] | null
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          address?: string | null
          location?: string | null
          category?: string | null
          vibe_tags?: string[] | null
          verified?: boolean
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          venue_id: string | null
          title: string
          description: string | null
          emoji: string
          category: string | null
          tags: string[] | null
          starts_at: string
          ends_at: string | null
          price_label: string
          location: string | null
          address: string | null
          status: 'pending' | 'live' | 'expired'
          source: string
          raw_email_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venue_id?: string | null
          title: string
          description?: string | null
          emoji?: string
          category?: string | null
          tags?: string[] | null
          starts_at: string
          ends_at?: string | null
          price_label?: string
          location?: string | null
          address?: string | null
          status?: 'pending' | 'live' | 'expired'
          source?: string
          raw_email_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          venue_id?: string | null
          title?: string
          description?: string | null
          emoji?: string
          category?: string | null
          tags?: string[] | null
          starts_at?: string
          ends_at?: string | null
          price_label?: string
          location?: string | null
          address?: string | null
          status?: 'pending' | 'live' | 'expired'
          source?: string
          raw_email_id?: string | null
          created_at?: string
        }
      }
      email_queue: {
        Row: {
          id: string
          from_address: string
          subject: string | null
          body_text: string | null
          body_html: string | null
          parsed_data: Json | null
          matched_venue_id: string | null
          status: 'pending' | 'approved' | 'rejected'
          received_at: string
        }
        Insert: {
          id?: string
          from_address: string
          subject?: string | null
          body_text?: string | null
          body_html?: string | null
          parsed_data?: Json | null
          matched_venue_id?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          received_at?: string
        }
        Update: {
          id?: string
          from_address?: string
          subject?: string | null
          body_text?: string | null
          body_html?: string | null
          parsed_data?: Json | null
          matched_venue_id?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          received_at?: string
        }
      }
      attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          display_name: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          display_name?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          display_name?: string | null
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          event_id: string
          attendee_id: string
          display_name: string | null
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          attendee_id: string
          display_name?: string | null
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          attendee_id?: string
          display_name?: string | null
          body?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_events: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      get_nearby_events: {
        Args: {
          lat: number
          lng: number
          radius_m?: number
          filter_category?: string | null
          result_limit?: number
        }
        Returns: {
          id: string
          venue_id: string | null
          title: string
          description: string | null
          emoji: string
          category: string | null
          tags: string[] | null
          starts_at: string
          ends_at: string | null
          price_label: string
          address: string | null
          status: string
          distance_m: number
          attendee_count: number
        }[]
      }
    }
    Enums: {
      event_status: 'pending' | 'live' | 'expired'
      email_status: 'pending' | 'approved' | 'rejected'
    }
  }
}

export type Venue = Database['public']['Tables']['venues']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EmailQueue = Database['public']['Tables']['email_queue']['Row']
export type Attendee = Database['public']['Tables']['attendees']['Row']
export type Message = Database['public']['Tables']['messages']['Row']