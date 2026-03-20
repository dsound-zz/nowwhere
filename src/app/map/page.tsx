'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import { Sidebar } from '@/components/layout/Sidebar'
import { RightPanel } from '@/components/layout/RightPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { VenuePanel } from '@/components/events/VenuePanel'
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

export default function MapPage() {
   const searchParams = useSearchParams()
   const [location, setLocation] = useState<UserLocation | null>(null)
   const [events, setEvents] = useState<Event[]>([])
   const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
   const [attendeeId, setAttendeeId] = useState<string | null>(null)
   const [displayName] = useState<string>('You')
   const mapContainerRef = useRef<HTMLDivElement>(null)
   const mapRef = useRef<mapboxgl.Map | null>(null)
   const markersRef = useRef<mapboxgl.Marker[]>([])

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

   // Fetch events
   useEffect(() => {
      if (!location) return

      const fetchEvents = async () => {
         try {
            const response = await fetch(
               `/api/events/nearby?lat=${location.lat}&lng=${location.lng}&radius_m=5000`
            )
            const data = await response.json()
            setEvents(data.events || [])
         } catch (err) {
            console.error('Failed to fetch events:', err)
         }
      }

      fetchEvents()
   }, [location])

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

   const handleJoin = async (eventId: string) => {
      try {
         const response = await fetch(`/api/events/${eventId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: 'You' }),
         })

         const data = await response.json()
         if (response.ok) {
            setAttendeeId(data.attendee_id)
         }
      } catch (err) {
         console.error('Failed to join event:', err)
      }
   }

   const handleVenueClick = async (venueId: string) => {
      // Fetch venue coordinates from API
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

            {/* Topbar overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-bg to-transparent p-4 pointer-events-none">
               <div className="bg-surface/90 backdrop-blur-lg border border-border rounded-full px-4 py-2 flex items-center gap-3 max-w-md pointer-events-auto">
                  <h1 className="font-display font-bold text-lg text-teal">Map View</h1>
                  <span className="text-xs text-muted">{events.length} events nearby</span>
               </div>
            </div>

            {/* Selected event overlay */}
            {selectedEvent && !attendeeId && (
               <div className="absolute bottom-4 left-4 right-4 z-10 lg:left-auto lg:right-[320px] lg:max-w-sm pointer-events-none">
                  <div className="bg-surface border border-border rounded-[--radius] p-4 pointer-events-auto">
                     <div className="flex items-start gap-3">
                        <div className="text-3xl">{selectedEvent.emoji}</div>
                        <div className="flex-1">
                           <h3 className="font-display font-semibold">{selectedEvent.title}</h3>
                           <p className="text-xs text-muted mt-1">
                              {selectedEvent.address || 'Nearby'} · {selectedEvent.attendee_count} going
                           </p>
                        </div>
                        <button
                           onClick={() => handleJoin(selectedEvent.id)}
                           className="bg-teal text-white rounded-full px-4 py-2 text-sm font-semibold"
                        >
                           Join
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </main>

         <RightPanel
            chatPanel={
               selectedEvent && attendeeId ? (
                  <ChatPanel
                     eventId={selectedEvent.id}
                     eventName={selectedEvent.title}
                     eventEmoji={selectedEvent.emoji}
                     attendeeId={attendeeId}
                     displayName={displayName}
                  />
               ) : (
                  <div className="text-center text-muted text-sm py-8">
                     Click an event marker to view details
                  </div>
               )
            }
            venuePanel={<VenuePanel onVenueClick={handleVenueClick} />}
         />
      </div>
   )
}
