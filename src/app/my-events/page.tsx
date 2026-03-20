'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { EventCard } from '@/components/events/EventCard'
import { RightPanel } from '@/components/layout/RightPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { VenuePanel } from '@/components/events/VenuePanel'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { AuthModal } from '@/components/auth/AuthModal'
import { createClient } from '@/lib/supabase/client'
import { Emoji } from '@/components/ui/Emoji'

interface Event {
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
   distance_m?: number
   attendee_count: number
   venue_name?: string | null
   location_lat?: number | null
   location_lng?: number | null
   joined_at?: string
}

export default function MyEventsPage() {
   const { user } = useAuth()
   const [showAuthModal, setShowAuthModal] = useState(false)
   const [events, setEvents] = useState<Event[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
   const [attendeeId, setAttendeeId] = useState<string | null>(null)
   const supabase = createClient()

   useEffect(() => {
      if (!user) {
         setIsLoading(false)
         return
      }

      const fetchMyEvents = async () => {
         setIsLoading(true)

         // Fetch events where the user is an attendee
         const { data: attendees, error } = await supabase
            .from('attendees')
            .select(`
          id,
          joined_at,
          events (
            id,
            venue_id,
            title,
            description,
            emoji,
            category,
            tags,
            starts_at,
            ends_at,
            price_label,
            address,
            status
          )
        `)
            .eq('user_id', user.id)
            .order('joined_at', { ascending: false })

         if (!error && attendees) {
            // Transform the data
            const eventList = attendees
               .filter((a) => a.events)
               .map((a) => ({
                  ...(a.events as any),
                  joined_at: a.joined_at,
                  attendee_count: 0,
                  distance_m: 0, // Distance not relevant for My Events page
               }))

            setEvents(eventList)
         }

         setIsLoading(false)
      }

      fetchMyEvents()
   }, [user, supabase])

   const handleLeaveEvent = async (eventId: string) => {
      if (!user) return

      if (!confirm('Are you sure you want to leave this event?')) {
         return
      }

      try {
         const { error } = await supabase
            .from('attendees')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', user.id)

         if (!error) {
            setEvents(events.filter((e) => e.id !== eventId))
            if (selectedEvent?.id === eventId) {
               setSelectedEvent(null)
               setAttendeeId(null)
            }
         }
      } catch (err) {
         console.error('Failed to leave event:', err)
      }
   }

   const handleEventClick = (eventId: string) => {
      const event = events.find((e) => e.id === eventId)
      if (event) {
         setSelectedEvent(event)
         // Get attendee ID for this event
         supabase
            .from('attendees')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user?.id)
            .single()
            .then(({ data }) => {
               if (data) setAttendeeId(data.id)
            })
      }
   }

   // Split into active and past events
   const now = new Date()
   const activeEvents = events.filter((e) => {
      const endsAt = e.ends_at ? new Date(e.ends_at) : new Date(e.starts_at)
      return e.status === 'live' && endsAt > now
   })

   const pastEvents = events.filter((e) => {
      const endsAt = e.ends_at ? new Date(e.ends_at) : new Date(e.starts_at)
      return e.status === 'expired' || endsAt <= now
   })

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Topbar */}
            <div className="sticky top-0 z-10 bg-[rgba(10,10,11,0.85)] backdrop-blur-xl border-b border-border px-7 py-4">
               <h1 className="font-display font-bold text-xl tracking-[-0.5px]">
                  My Events
               </h1>
            </div>

            {/* Content */}
            {!user ? (
               // Not authenticated
               <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                  <div className="max-w-md text-center px-6">
                     <div className="mb-4">
                        <Emoji emoji="🎟️" size={40} />
                     </div>
                     <h2 className="font-display font-bold text-2xl mb-3">Sign in to see your events</h2>
                     <p className="text-muted mb-6">
                        Create an account to join events and see them all in one place.
                     </p>
                     <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-6 py-2.5 rounded-full bg-teal text-white font-semibold transition-opacity hover:opacity-90"
                     >
                        Sign in
                     </button>
                  </div>
               </div>
            ) : isLoading ? (
               <div className="flex items-center justify-center h-64 text-muted">
                  Loading your events...
               </div>
            ) : events.length === 0 ? (
               // Empty state
               <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                  <div className="max-w-md text-center px-6">
                     <div className="mb-4">
                        <Emoji emoji="📍" size={40} />
                     </div>
                     <h2 className="font-display font-bold text-2xl mb-3">No events yet</h2>
                     <p className="text-muted mb-6">
                        Join an event from the feed to see it here.
                     </p>
                     <a
                        href="/"
                        className="inline-block px-6 py-2.5 rounded-full bg-teal text-white font-semibold transition-opacity hover:opacity-90"
                     >
                        Browse events
                     </a>
                  </div>
               </div>
            ) : (
               <>
                  {/* Active Events */}
                  {activeEvents.length > 0 && (
                     <div className="px-7 py-6">
                        <h2 className="font-display font-bold text-[15px] tracking-[-0.2px] mb-3.5">
                           Active events ({activeEvents.length})
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                           {activeEvents.map((event) => (
                              <div key={event.id} className="relative">
                                 <EventCard
                                    event={{ ...event, distance_m: event.distance_m || 0 }}
                                    onClick={handleEventClick}
                                 />
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation()
                                       handleLeaveEvent(event.id)
                                    }}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface2 border border-border flex items-center justify-center text-xs text-muted hover:bg-coral-dim hover:text-coral hover:border-coral transition-colors"
                                    title="Leave event"
                                 >
                                    ✕
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Past Events */}
                  {pastEvents.length > 0 && (
                     <div className="px-7 pb-6">
                        <h2 className="font-display font-bold text-[15px] tracking-[-0.2px] mb-3.5 text-muted">
                           Past events ({pastEvents.length})
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 opacity-60">
                           {pastEvents.map((event) => (
                              <EventCard
                                 key={event.id}
                                 event={{ ...event, distance_m: event.distance_m || 0 }}
                                 onClick={() => { }}
                              />
                           ))}
                        </div>
                     </div>
                  )}
               </>
            )}
         </main>

         {/* Right panel */}
         <RightPanel
            chatPanel={
               selectedEvent && attendeeId ? (
                  <ChatPanel
                     eventId={selectedEvent.id}
                     eventName={selectedEvent.title}
                     eventEmoji={selectedEvent.emoji}
                     attendeeId={attendeeId}
                     displayName={user?.email?.split('@')[0] || 'You'}
                  />
               ) : (
                  <div className="text-center text-muted text-sm py-8">
                     Select an event to view chat
                  </div>
               )
            }
            venuePanel={<VenuePanel />}
         />

         {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
   )
}
