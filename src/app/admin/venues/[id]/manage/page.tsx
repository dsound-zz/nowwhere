'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'

interface Venue {
   id: string
   name: string
   email: string
   address: string | null
   category: string | null
   description: string | null
   hours: string | null
   phone: string | null
   website: string | null
}

interface Event {
   id: string
   title: string
   description: string | null
   category: string | null
   starts_at: string
   ends_at: string | null
   price_label: string
   emoji: string
   status: string
}

const categoryOptions = [
   { value: 'music', label: 'Music' },
   { value: 'food', label: 'Food & Drink' },
   { value: 'art', label: 'Art' },
   { value: 'sport', label: 'Sport' },
   { value: 'social', label: 'Social' },
]

const emojiOptions = ['🎤', '🎷', '🍜', '🎨', '🏀', '💃', '🎭', '📚', '🎬', '🏆']

export default function VenueManagePage() {
   const { user, loading: authLoading } = useAuth()
   const router = useRouter()
   const params = useParams()
   const venueId = params.id as string
   const supabase = createClient()

   const [venue, setVenue] = useState<Venue | null>(null)
   const [events, setEvents] = useState<Event[]>([])
   const [emailQueue, setEmailQueue] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [isOwner, setIsOwner] = useState(false)

   // Event form state
   const [showEventForm, setShowEventForm] = useState(false)
   const [editingEvent, setEditingEvent] = useState<Event | null>(null)
   const [eventForm, setEventForm] = useState({
      title: '',
      description: '',
      category: 'social',
      starts_at: '',
      ends_at: '',
      price_label: 'Free',
      emoji: '🎤'
   })
   const [isSaving, setIsSaving] = useState(false)

   // Check auth and ownership
   useEffect(() => {
      if (!authLoading && !user) {
         router.push('/')
      }
   }, [user, authLoading, router])

   // Fetch venue and check ownership
   useEffect(() => {
      const fetchData = async () => {
         if (!user) return

         try {
            // Fetch venue
            const { data: venueData } = await supabase
               .from('venues')
               .select('*')
               .eq('id', venueId)
               .single()

            if (venueData) {
               setVenue(venueData as Venue)
            }

            // Check ownership via RPC
            const { data: ownsVenue } = await supabase.rpc('user_owns_venue', {
               check_venue_id: venueId
            })

            setIsOwner(ownsVenue || false)

            // Fetch events
            const { data: eventsData } = await supabase
               .from('events')
               .select('*')
               .eq('venue_id', venueId)
               .order('starts_at', { ascending: true })

            if (eventsData) {
               setEvents(eventsData as Event[])
            }

            // Fetch pending email queue
            const { data: queueData } = await supabase
               .from('email_queue')
               .select('id, status, parsed_data, received_at')
               .eq('matched_venue_id', venueId)
               .eq('status', 'pending')
               .order('received_at', { ascending: false })

            if (queueData) {
               setEmailQueue(queueData)
            }
         } catch (err) {
            console.error('Error fetching venue:', err)
         } finally {
            setIsLoading(false)
         }
      }

      fetchData()
   }, [user, venueId, supabase])

   // Create or update event
   const handleSaveEvent = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!venue) return

      setIsSaving(true)

      try {
         const eventData = {
            ...eventForm,
            venue_id: venueId,
            status: 'live' as const
         }

         let response
         if (editingEvent) {
            // Update existing event
            response = await fetch(`/api/events/${editingEvent.id}`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(eventData)
            })
         } else {
            // Create new event
            response = await fetch('/api/events', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(eventData)
            })
         }

         const data = await response.json()

         if (!response.ok) {
            throw new Error(data.error || 'Failed to save event')
         }

         // Refresh events list
         const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('venue_id', venueId)
            .order('starts_at', { ascending: true })

         if (eventsData) {
            setEvents(eventsData as Event[])
         }

         setShowEventForm(false)
         setEditingEvent(null)
         setEventForm({
            title: '',
            description: '',
            category: 'social',
            starts_at: '',
            ends_at: '',
            price_label: 'Free',
            emoji: '🎤'
         })
      } catch (err) {
         console.error('Event save error:', err)
         alert(err instanceof Error ? err.message : 'Failed to save event')
      } finally {
         setIsSaving(false)
      }
   }

   // Edit event
   const handleEditEvent = (event: Event) => {
      setEditingEvent(event)
      setEventForm({
         title: event.title,
         description: event.description || '',
         category: event.category || 'social',
         starts_at: new Date(event.starts_at).toISOString().slice(0, 16),
         ends_at: event.ends_at ? new Date(event.ends_at).toISOString().slice(0, 16) : '',
         price_label: event.price_label,
         emoji: event.emoji
      })
      setShowEventForm(true)
   }

   // Delete event
   const handleDeleteEvent = async (eventId: string) => {
      if (!confirm('Are you sure you want to delete this event?')) return

      try {
         const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE'
         })

         if (!response.ok) {
            throw new Error('Failed to delete event')
         }

         setEvents(events.filter(e => e.id !== eventId))
      } catch (err) {
         console.error('Delete error:', err)
         alert('Failed to delete event')
      }
   }

   // Approve pending email queue
   const handleApproveEmailQueue = async (emailId: string) => {
      try {
         const response = await fetch(`/api/email-queue/${emailId}/approve`, {
            method: 'POST'
         })

         if (!response.ok) throw new Error('Failed to approve email queue item')

         setEmailQueue(prev => prev.filter(eq => eq.id !== emailId))
         
         const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('venue_id', venueId)
            .order('starts_at', { ascending: true })

         if (eventsData) setEvents(eventsData as Event[])
      } catch (err) {
         console.error('Approve email error:', err)
         alert('Failed to approve email')
      }
   }

   // Approve pending event
   const handleApproveEvent = async (eventId: string) => {
      try {
         const response = await fetch(`/api/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'live' })
         })

         if (!response.ok) throw new Error('Failed to approve event')

         setEvents(prev => prev.map(ev => 
            ev.id === eventId ? { ...ev, status: 'live' } : ev
         ))
      } catch (err) {
         console.error('Approve error:', err)
         alert('Failed to approve event')
      }
   }

   if (authLoading || !user) {
      return (
         <div className="flex h-screen items-center justify-center bg-bg">
            <div className="text-muted">Loading...</div>
         </div>
      )
   }

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 overflow-y-auto">
            <div className="p-7">
               {/* Header */}
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h1 className="font-display font-bold text-2xl">
                        {venue?.name || 'Venue Management'}
                     </h1>
                     <p className="text-sm text-muted mt-1">
                        {venue?.address || 'Manage your venue events'}
                     </p>
                  </div>
                  {isOwner && (
                     <button
                        onClick={() => {
                           setEditingEvent(null)
                           setEventForm({
                              title: '',
                              description: '',
                              category: 'social',
                              starts_at: '',
                              ends_at: '',
                              price_label: 'Free',
                              emoji: '🎤'
                           })
                           setShowEventForm(true)
                        }}
                        className="bg-teal text-bg font-semibold px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-90"
                     >
                        + Add Event
                     </button>
                  )}
               </div>

               {/* Not owner warning */}
               {!isLoading && !isOwner && (
                  <div className="bg-amber-dim border border-[rgba(245,166,35,.2)] rounded-lg p-4 mb-6">
                     <p className="text-amber text-sm">
                        You do not have permission to manage this venue.
                        If you believe this is an error, please contact support.
                     </p>
                  </div>
               )}

               {/* Events List */}
               {isLoading ? (
                  <div className="text-muted">Loading events...</div>
               ) : (
                  <>
                     {emailQueue.length > 0 && (
                        <div className="mb-8">
                           <h2 className="text-lg font-semibold mb-4 text-amber flex items-center gap-2">
                              <span className="text-xl">📧</span>
                              Pending Email Approvals ({emailQueue.length})
                           </h2>
                           <div className="space-y-3">
                              {emailQueue.map((queue) => (
                                 <div key={queue.id} className="bg-amber/10 border border-amber/30 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                       <div>
                                          <div className="flex items-center gap-2">
                                             <h3 className="font-semibold text-amber-dim">{queue.parsed_data?.title || 'Unknown Event'}</h3>
                                          </div>
                                          <div className="text-xs text-amber mt-1">
                                             Received {new Date(queue.received_at).toLocaleDateString()}
                                          </div>
                                       </div>
                                       {isOwner && (
                                          <button
                                             onClick={() => handleApproveEmailQueue(queue.id)}
                                             className="text-xs font-semibold bg-amber border-none text-bg px-3 py-1.5 rounded transition-opacity hover:opacity-90 cursor-pointer flex-shrink-0"
                                          >
                                             Approve Email
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {events.length === 0 && emailQueue.length === 0 ? (
                        <div className="bg-surface2 border border-border rounded-lg p-8 text-center">
                           <div className="text-4xl mb-4">📅</div>
                           <p className="text-muted mb-4">No events yet</p>
                           {isOwner && (
                              <button
                                 onClick={() => setShowEventForm(true)}
                                 className="text-teal hover:underline"
                              >
                                 Create your first event
                              </button>
                           )}
                        </div>
                     ) : (
                        <div>
                           <h2 className="text-base font-semibold mb-4 text-muted">Active/Historical Events ({events.length})</h2>
                           <div className="space-y-3">
                              {events.map((event) => (
                        <div
                           key={event.id}
                           className="bg-surface2 border border-border rounded-lg p-4"
                        >
                           <div className="flex items-start justify-between">
                              <div>
                                 <div className="flex items-center gap-2">
                                    <span className="text-xl">{event.emoji}</span>
                                    <h3 className="font-semibold">{event.title}</h3>
                                 </div>
                                 <div className="text-xs text-muted mt-1">
                                    {new Date(event.starts_at).toLocaleDateString()} · {event.price_label}
                                 </div>
                                 {event.description && (
                                    <p className="text-sm text-muted mt-2 line-clamp-2">
                                       {event.description}
                                    </p>
                                 )}
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className={`text-xs px-2 py-1 rounded ${event.status === 'live' ? 'bg-green/20 text-green' :
                                    event.status === 'pending' ? 'bg-amber/20 text-amber' : 'bg-surface text-muted'
                                    }`}>
                                    {event.status}
                                 </span>
                                 {isOwner && (
                                    <>
                                       <button
                                          onClick={() => handleEditEvent(event)}
                                          className="text-teal text-xs hover:underline"
                                       >
                                          Edit
                                       </button>
                                       <button
                                          onClick={() => handleDeleteEvent(event.id)}
                                          className="text-coral text-xs hover:underline"
                                       >
                                          Delete
                                       </button>
                                    </>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}
                           </div>
                        </div>
                     )}
                  </>
               )}
            </div>
         </main>

         {/* Event Form Modal */}
         {showEventForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
               <div className="bg-surface2 border border-border rounded-lg p-6 w-full max-w-md">
                  <h3 className="font-semibold mb-4">
                     {editingEvent ? 'Edit Event' : `Create Event at ${venue?.name}`}
                  </h3>

                  <form onSubmit={handleSaveEvent} className="space-y-4">
                     <div>
                        <label className="block text-xs text-muted mb-1">Title</label>
                        <input
                           type="text"
                           value={eventForm.title}
                           onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                           required
                           className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                        />
                     </div>

                     <div>
                        <label className="block text-xs text-muted mb-1">Description</label>
                        <textarea
                           value={eventForm.description}
                           onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                           rows={2}
                           className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs text-muted mb-1">Category</label>
                           <select
                              value={eventForm.category}
                              onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                           >
                              {categoryOptions.map(opt => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                           </select>
                        </div>

                        <div>
                           <label className="block text-xs text-muted mb-1">Price</label>
                           <select
                              value={eventForm.price_label}
                              onChange={(e) => setEventForm(prev => ({ ...prev, price_label: e.target.value }))}
                              className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                           >
                              <option value="Free">Free</option>
                              <option value="$">$</option>
                              <option value="$$">$$</option>
                              <option value="$$$">$$$</option>
                           </select>
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs text-muted mb-1">Emoji</label>
                        <div className="flex gap-2">
                           {emojiOptions.map(emoji => (
                              <button
                                 key={emoji}
                                 type="button"
                                 onClick={() => setEventForm(prev => ({ ...prev, emoji }))}
                                 className={`w-8 h-8 rounded flex items-center justify-center text-lg ${eventForm.emoji === emoji ? 'bg-teal/20 border border-teal' : 'bg-surface border border-border2'
                                    }`}
                              >
                                 {emoji}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs text-muted mb-1">Starts At</label>
                           <input
                              type="datetime-local"
                              value={eventForm.starts_at}
                              onChange={(e) => setEventForm(prev => ({ ...prev, starts_at: e.target.value }))}
                              required
                              className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                           />
                        </div>

                        <div>
                           <label className="block text-xs text-muted mb-1">Ends At</label>
                           <input
                              type="datetime-local"
                              value={eventForm.ends_at}
                              onChange={(e) => setEventForm(prev => ({ ...prev, ends_at: e.target.value }))}
                              className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                           />
                        </div>
                     </div>

                     <div className="flex gap-3 pt-2">
                        <button
                           type="button"
                           onClick={() => {
                              setShowEventForm(false)
                              setEditingEvent(null)
                           }}
                           className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm font-medium"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isSaving}
                           className="flex-1 bg-teal text-bg rounded-lg py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                           {isSaving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   )
}