'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'

interface Venue {
   id: string
   name: string
   email: string
   address: string | null
   category: string | null
   vibe_tags: string[] | null
   verified: boolean
   description: string | null
   hours: string | null
   phone: string | null
   website: string | null
   rating: number | null
}

interface FoursquareResult {
   fsq_id: string
   name: string
   location: {
      address?: string
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

interface Event {
   id: string
   title: string
   starts_at: string
   ends_at: string | null
   status: string
   price_label: string
}

const categoryOptions = [
   { value: 'music', label: 'Music' },
   { value: 'food', label: 'Food & Drink' },
   { value: 'art', label: 'Art' },
   { value: 'sport', label: 'Sport' },
   { value: 'social', label: 'Social' },
]

export default function AdminVenuesPage() {
   const { user, loading: authLoading } = useAuth()
   const router = useRouter()
   const supabase = createClient()

   const [venues, setVenues] = useState<Venue[]>([])
   const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
   const [venueEvents, setVenueEvents] = useState<Event[]>([])
   const [isLoading, setIsLoading] = useState(true)

   // Foursquare search state
   const [searchQuery, setSearchQuery] = useState('')
   const [searchResults, setSearchResults] = useState<FoursquareResult[]>([])
   const [isSearching, setIsSearching] = useState(false)
   const [searchError, setSearchError] = useState<string | null>(null)

   // Import state
   const [importingId, setImportingId] = useState<string | null>(null)

   // Event form state
   const [showEventForm, setShowEventForm] = useState(false)
   const [eventForm, setEventForm] = useState({
      title: '',
      description: '',
      category: 'social',
      starts_at: '',
      ends_at: '',
      price_label: 'Free',
      emoji: '🎤'
   })
   const [isSavingEvent, setIsSavingEvent] = useState(false)

   // Check auth on mount
   useEffect(() => {
      if (!authLoading && !user) {
         router.push('/')
         return
      }

      // Check if user is admin
      if (user) {
         const checkAdmin = async () => {
            const { data: isAdmin } = await supabase.rpc('is_admin_user')
            if (!isAdmin) {
               router.push('/')
            }
         }
         checkAdmin()
      }
   }, [user, authLoading, router, supabase])

   // Fetch venues
   useEffect(() => {
      const fetchVenues = async () => {
         const { data } = await supabase
            .from('venues')
            .select('*')
            .order('name')

         if (data) setVenues(data as Venue[])
         setIsLoading(false)
      }

      if (user) fetchVenues()
   }, [user, supabase])

   // Fetch events for selected venue
   useEffect(() => {
      const fetchVenueEvents = async () => {
         if (!selectedVenue) {
            setVenueEvents([])
            return
         }

         const { data } = await supabase
            .from('events')
            .select('id, title, starts_at, ends_at, status, price_label')
            .eq('venue_id', selectedVenue.id)
            .order('starts_at', { ascending: false })

         if (data) setVenueEvents(data as Event[])
      }

      fetchVenueEvents()
   }, [selectedVenue, supabase])

   // Search Foursquare
   const handleSearch = useCallback(async () => {
      if (!searchQuery.trim()) return

      setIsSearching(true)
      setSearchError(null)

      try {
         const response = await fetch(`/api/foursquare/search?q=${encodeURIComponent(searchQuery)}`)
         const data = await response.json()

         if (!response.ok) {
            throw new Error(data.error || 'Search failed')
         }

         setSearchResults(data.results || [])
      } catch (err) {
         setSearchError(err instanceof Error ? err.message : 'Search failed')
      } finally {
         setIsSearching(false)
      }
   }, [searchQuery])

   // Import venue from Foursquare
   const handleImport = async (result: FoursquareResult) => {
      setImportingId(result.fsq_id)

      try {
         const response = await fetch('/api/venues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               name: result.name,
               address: result.location.formatted_address || result.location.address,
               latitude: result.geocodes.main.latitude,
               longitude: result.geocodes.main.longitude,
               category: result.categories[0]?.name.toLowerCase() || 'social',
               fsq_id: result.fsq_id
            })
         })

         const data = await response.json()

         if (!response.ok) {
            throw new Error(data.error || 'Import failed')
         }

         // Add to venues list
         setVenues(prev => [data.venue, ...prev])
         setSearchResults(prev => prev.filter(r => r.fsq_id !== result.fsq_id))
      } catch (err) {
         console.error('Import error:', err)
         alert(err instanceof Error ? err.message : 'Failed to import venue')
      } finally {
         setImportingId(null)
      }
   }

   // Create event manually
   const handleCreateEvent = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedVenue) return

      setIsSavingEvent(true)

      try {
         const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               ...eventForm,
               venue_id: selectedVenue.id,
               source: 'manual'
            })
         })

         const data = await response.json()

         if (!response.ok) {
            throw new Error(data.error || 'Failed to create event')
         }

         // Add to events list
         setVenueEvents(prev => [data.event, ...prev])
         setShowEventForm(false)
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
         console.error('Event creation error:', err)
         alert(err instanceof Error ? err.message : 'Failed to create event')
      } finally {
         setIsSavingEvent(false)
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
               <h1 className="font-display font-bold text-2xl mb-6">
                  Venue <span className="text-teal">Admin</span>
               </h1>

               {/* Foursquare Search */}
               <div className="bg-surface2 border border-border rounded-lg p-4 mb-6">
                  <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                     </svg>
                     Import from Foursquare
                  </h2>

                  <div className="flex gap-2">
                     <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search venues..."
                        className="flex-1 bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                     />
                     <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="bg-teal text-bg font-semibold px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                     >
                        {isSearching ? 'Searching...' : 'Search'}
                     </button>
                  </div>

                  {searchError && (
                     <p className="text-coral text-xs mt-2">{searchError}</p>
                  )}

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                     <div className="mt-4 space-y-2">
                        {searchResults.map((result) => (
                           <div
                              key={result.fsq_id}
                              className="bg-surface border border-border2 rounded-lg p-3 flex items-center justify-between"
                           >
                              <div>
                                 <div className="font-medium text-sm">{result.name}</div>
                                 <div className="text-xs text-muted">
                                    {result.location.formatted_address || result.location.address}
                                    {result.categories[0] && (
                                       <span className="ml-2 text-teal">
                                          {result.categories[0].name}
                                       </span>
                                    )}
                                 </div>
                              </div>
                              <button
                                 onClick={() => handleImport(result)}
                                 disabled={importingId === result.fsq_id}
                                 className="bg-teal/20 text-teal font-medium px-3 py-1.5 rounded text-xs transition-colors hover:bg-teal/30 disabled:opacity-50"
                              >
                                 {importingId === result.fsq_id ? 'Importing...' : 'Import'}
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Venues List */}
               <div className="flex gap-6">
                  <div className="flex-1">
                     <h2 className="text-sm font-semibold mb-3">
                        {venues.length} Venues
                     </h2>

                     {isLoading ? (
                        <div className="text-muted text-sm">Loading venues...</div>
                     ) : (
                        <div className="space-y-2">
                           {venues.map((venue) => (
                              <button
                                 key={venue.id}
                                 onClick={() => setSelectedVenue(venue)}
                                 className={`w-full text-left bg-surface2 border rounded-lg p-3 transition-colors ${selectedVenue?.id === venue.id
                                    ? 'border-teal bg-teal/10'
                                    : 'border-border hover:border-border2'
                                    }`}
                              >
                                 <div className="font-medium text-sm flex items-center gap-2">
                                    {venue.name}
                                    {venue.verified && (
                                       <span className="text-green text-xs">✓</span>
                                    )}
                                 </div>
                                 <div className="text-xs text-muted">
                                    {venue.category && (
                                       <span className="text-teal mr-2">{venue.category}</span>
                                    )}
                                    {venue.address}
                                 </div>
                              </button>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Venue Detail Panel */}
                  {selectedVenue && (
                     <div className="w-96 bg-surface2 border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                           <div>
                              <h3 className="font-semibold">{selectedVenue.name}</h3>
                              <p className="text-xs text-muted">{selectedVenue.address}</p>
                           </div>
                           <button
                              onClick={() => setSelectedVenue(null)}
                              className="text-muted hover:text-text"
                           >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                 <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                           </button>
                        </div>

                        <div className="space-y-2 mb-4 text-xs">
                           {selectedVenue.category && (
                              <div><span className="text-muted">Category:</span> <span className="text-teal">{selectedVenue.category}</span></div>
                           )}
                           {selectedVenue.hours && (
                              <div><span className="text-muted">Hours:</span> {selectedVenue.hours}</div>
                           )}
                           {selectedVenue.phone && (
                              <div><span className="text-muted">Phone:</span> {selectedVenue.phone}</div>
                           )}
                           {selectedVenue.website && (
                              <div><span className="text-muted">Website:</span> {selectedVenue.website}</div>
                           )}
                        </div>

                        {/* Events for venue */}
                        <div className="border-t border-border pt-4">
                           <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold">Events ({venueEvents.length})</h4>
                              <button
                                 onClick={() => setShowEventForm(true)}
                                 className="text-teal text-xs font-medium hover:underline"
                              >
                                 + Add Event
                              </button>
                           </div>

                           {venueEvents.length === 0 ? (
                              <p className="text-xs text-muted">No events yet</p>
                           ) : (
                              <div className="space-y-2">
                                 {venueEvents.map((event) => (
                                    <div key={event.id} className="bg-surface rounded-lg p-2">
                                       <div className="font-medium text-sm">{event.title}</div>
                                       <div className="text-xs text-muted">
                                          {new Date(event.starts_at).toLocaleDateString()} · {event.price_label}
                                       </div>
                                       <div className={`text-xs mt-1 ${event.status === 'live' ? 'text-green' :
                                          event.status === 'pending' ? 'text-amber' : 'text-muted'
                                          }`}>
                                          {event.status}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </main>

         {/* Event Creation Modal */}
         {showEventForm && selectedVenue && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
               <div className="bg-surface2 border border-border rounded-lg p-6 w-full max-w-md">
                  <h3 className="font-semibold mb-4">Create Event at {selectedVenue.name}</h3>

                  <form onSubmit={handleCreateEvent} className="space-y-4">
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
                           onClick={() => setShowEventForm(false)}
                           className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm font-medium"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isSavingEvent}
                           className="flex-1 bg-teal text-bg rounded-lg py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                           {isSavingEvent ? 'Creating...' : 'Create Event'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   )
}