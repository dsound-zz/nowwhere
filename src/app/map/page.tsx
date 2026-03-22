'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import { Sidebar } from '@/components/layout/Sidebar'
import { RightPanel } from '@/components/layout/RightPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { VenuePanel } from '@/components/events/VenuePanel'
import { VenueDetailPanel } from '@/components/events/VenueDetailPanel'
import { getOpenMojiUrl } from '@/lib/emoji'

interface Event {
   id: string
   title: string
   emoji: string
   category: string | null
   distance_m: number
   attendee_count: number
   location: string | null
   starts_at: string
   address: string | null
   location_lat: number | null
   location_lng: number | null
}

interface UserLocation {
   lat: number
   lng: number
}

const defaultLocation: UserLocation = {
   lat: 40.7231,
   lng: -73.9873,
}

const categoryColors: Record<string, string> = {
   music: '#7C6EF6',
   food: '#3ecf8e',
   art: '#f5a623',
   sport: '#4f9cf9',
   social: '#f06449',
}

function MapContent() {
   const searchParams = useSearchParams()
   const [location, setLocation] = useState<UserLocation | null>(null)
   const [events, setEvents] = useState<Event[]>([])
   const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
   const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
   const [attendeeId, setAttendeeId] = useState<string | null>(null)
   const [displayName] = useState<string>('You')
   const mapContainerRef = useRef<HTMLDivElement>(null)
   const mapRef = useRef<mapboxgl.Map | null>(null)
   const markersRef = useRef<mapboxgl.Marker[]>([])

   // FR-18 & FR-19: Filter state for Mapbox markers
   const [rightNowFilter, setRightNowFilter] = useState(false)
   const [freeOnlyFilter, setFreeOnlyFilter] = useState(false)

   // Get target location from URL params or user location
   useEffect(() => {
      const urlLat = searchParams.get('lat')
      const urlLng = searchParams.get('lng')

      // If URL has coordinates, use those
      if (urlLat && urlLng) {
         setLocation({
            lat: parseFloat(urlLat),
            lng: parseFloat(urlLng),
         })
         return
      }

      // Otherwise get user location
      if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition(
            (pos) => {
               setLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
               })
            },
            () => {
               setLocation(defaultLocation)
            },
            { enableHighAccuracy: true, timeout: 10000 }
         )
      } else {
         setLocation(defaultLocation)
      }
   }, [searchParams])

   // Fetch events with filters (FR-18 & FR-19)
   useEffect(() => {
      if (!location) return

      const fetchEvents = async () => {
         try {
            const freeOnlyParam = freeOnlyFilter ? '&free_only=true' : ''
            const happeningNowParam = rightNowFilter ? '&happening_now=true' : ''
            const response = await fetch(
               `/api/events/nearby?lat=${location.lat}&lng=${location.lng}&radius_m=5000${freeOnlyParam}${happeningNowParam}`
            )
            const data = await response.json()
            setEvents(data.events || [])
         } catch (err) {
            console.error('Failed to fetch events:', err)
         }
      }

      fetchEvents()
   }, [location, rightNowFilter, freeOnlyFilter])

   // Initialize map
   useEffect(() => {
      if (!location || !mapContainerRef.current || mapRef.current) return

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      // Get zoom from URL or use default
      const urlZoom = searchParams.get('zoom')
      const zoom = urlZoom ? parseFloat(urlZoom) : 14

      const map = new mapboxgl.Map({
         container: mapContainerRef.current,
         style: 'mapbox://styles/mapbox/dark-v11',
         center: [location.lng, location.lat],
         zoom: zoom,
      })

      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

      // Add user location marker only if not coming from venue link
      const urlLat = searchParams.get('lat')
      if (!urlLat) {
         new mapboxgl.Marker({ color: '#3ecf8e' })
            .setLngLat([location.lng, location.lat])
            .addTo(map)
      }

      mapRef.current = map
   }, [location, searchParams])

   // Add event markers
   useEffect(() => {
      if (!mapRef.current || !events.length) return

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      events.forEach((event) => {
         // Skip events without valid coordinates
         if (!event.location_lng || !event.location_lat) {
            console.warn('Event missing coordinates:', event.id, event.title)
            return
         }

         // Create custom marker element
         const el = document.createElement('div')
         el.className = 'event-marker'
         el.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${categoryColors[event.category || 'social'] || '#5BB5A2'};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        user-select: none;
        will-change: transform;
      `
         // Use OpenMoji image
         const emojiImg = document.createElement('img')
         emojiImg.src = getOpenMojiUrl(event.emoji)
         emojiImg.alt = event.emoji
         emojiImg.style.cssText = 'width: 20px; height: 20px; pointer-events: none;'
         el.appendChild(emojiImg)

         // Simple click handler - no hover effects for now
         el.addEventListener('click', (e) => {
            e.stopPropagation()
            e.preventDefault()
            setSelectedEvent(event)
         })

         // Use real coordinates from the database with proper anchor
         const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
         })
            .setLngLat([event.location_lng, event.location_lat])
            .addTo(mapRef.current!)

         markersRef.current.push(marker)
      })
   }, [events])

   const handleJoinFromChat = async (eventId: string): Promise<{ attendeeId: string; displayName: string } | null> => {
      try {
         const response = await fetch(`/api/events/${eventId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: 'You' }),
         })

         const data = await response.json()
         if (response.ok) {
            setAttendeeId(data.attendee_id)
            return { attendeeId: data.attendee_id, displayName: 'You' }
         }
      } catch (err) {
         console.error('Failed to join event:', err)
      }
      return null
   }

   const handleVenueClick = async (venueId: string) => {
      // Set selected venue to show detail panel
      setSelectedVenueId(venueId)

      // Fetch venue coordinates from API and fly to location
      try {
         const response = await fetch(`/api/venues/${venueId}`)
         if (response.ok) {
            const venue = await response.json()
            if (venue.lat && venue.lng && mapRef.current) {
               // Fly to venue location with smooth animation
               mapRef.current.flyTo({
                  center: [venue.lng, venue.lat],
                  zoom: 16,
                  duration: 1500,
                  essential: true
               })
            }
         }
      } catch (error) {
         console.error('Failed to fetch venue:', error)
      }
   }

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 relative">
            {/* Map container */}
            <div
               ref={mapContainerRef}
               className="absolute inset-0"
               style={{ width: '100%', height: '100%' }}
            />

            {/* Topbar overlay with filters */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-bg to-transparent p-4 pointer-events-none">
               <div className="flex flex-col gap-2 pointer-events-auto">
                  <div className="bg-surface/90 backdrop-blur-lg border border-border rounded-full px-4 py-2 flex items-center gap-3 max-w-md">
                     <h1 className="font-display font-bold text-lg text-teal">Map View</h1>
                     <span className="text-xs text-muted">{events.length} events nearby</span>
                  </div>
                  {/* FR-18 & FR-19: Filter toggle buttons */}
                  <div className="flex gap-2">
                     <button
                        onClick={() => setRightNowFilter(!rightNowFilter)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${rightNowFilter
                           ? 'bg-teal text-white'
                           : 'bg-surface/90 backdrop-blur-lg border border-border text-muted hover:text-text hover:border-teal'
                           }`}
                     >
                        <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none strokeWidth-2">
                           <circle cx="12" cy="12" r="10" />
                           <polyline points="12,6 12,12 16,14" />
                        </svg>
                        Right Now
                     </button>
                     <button
                        onClick={() => setFreeOnlyFilter(!freeOnlyFilter)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${freeOnlyFilter
                           ? 'bg-teal text-white'
                           : 'bg-surface/90 backdrop-blur-lg border border-border text-muted hover:text-text hover:border-teal'
                           }`}
                     >
                        <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none strokeWidth-2">
                           <line x1="12" y1="1" x2="12" y2="23" />
                           <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        Free Only
                     </button>
                  </div>
               </div>
            </div>

         </main>

         <RightPanel
            chatPanel={
               selectedEvent ? (
                  <ChatPanel
                     eventId={selectedEvent.id}
                     eventName={selectedEvent.title}
                     eventEmoji={selectedEvent.emoji}
                     attendeeId={attendeeId}
                     displayName={displayName}
                     onJoin={handleJoinFromChat}
                  />
               ) : (
                  <div className="text-center text-muted text-sm py-8">
                     Click an event marker to view chat
                  </div>
               )
            }
            venuePanel={<VenuePanel onVenueClick={handleVenueClick} />}
         />

         {/* Venue Detail Panel */}
         {selectedVenueId && (
            <VenueDetailPanel
               venueId={selectedVenueId}
               onClose={() => setSelectedVenueId(null)}
            />
         )}
      </div>
   )
}

export default function MapPage() {
   return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted">Loading map...</div>}>
         <MapContent />
      </Suspense>
   )
}
