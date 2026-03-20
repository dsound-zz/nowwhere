'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import { Emoji } from '@/components/ui/Emoji'
import type { VenueDetail } from '@/data/mock-venue-details'
import { categoryEmojis } from '@/data/mock-venue-details'

interface VenueDetailPanelProps {
   venue: VenueDetail
   onClose: () => void
}

const categoryColors: Record<string, string> = {
   music: 'bg-indigo-dim text-indigo',
   food: 'bg-green-dim text-green',
   art: 'bg-amber-dim text-amber',
   sport: 'bg-[rgba(79,156,249,.12)] text-blue',
   social: 'bg-coral-dim text-coral',
}

export function VenueDetailPanel({ venue, onClose }: VenueDetailPanelProps) {
   const router = useRouter()
   const mapContainerRef = useRef<HTMLDivElement>(null)
   const mapRef = useRef<mapboxgl.Map | null>(null)

   // Initialize mini map
   useEffect(() => {
      if (!mapContainerRef.current || mapRef.current) return

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      const map = new mapboxgl.Map({
         container: mapContainerRef.current,
         style: 'mapbox://styles/mapbox/dark-v11',
         center: [venue.lng, venue.lat],
         zoom: 15,
         interactive: true, // Allow interaction
         attributionControl: false,
      })

      // Add venue marker
      new mapboxgl.Marker({
         color: venue.category === 'music' ? '#7C6EF6' :
            venue.category === 'food' ? '#3ecf8e' :
               venue.category === 'art' ? '#f5a623' :
                  venue.category === 'sport' ? '#4f9cf9' :
                     '#f06449',
      })
         .setLngLat([venue.lng, venue.lat])
         .addTo(map)

      mapRef.current = map

      return () => {
         if (mapRef.current) {
            mapRef.current.remove()
            mapRef.current = null
         }
      }
   }, [venue])

   const handleMapClick = () => {
      // Navigate to map page with venue coordinates
      router.push(`/map?lat=${venue.lat}&lng=${venue.lng}&zoom=16&venue=${encodeURIComponent(venue.name)}`)
      onClose()
   }

   const handleBackdropClick = (e: React.MouseEvent) => {
      // Only close if clicking the backdrop, not the panel
      if (e.target === e.currentTarget) {
         onClose()
      }
   }

   return (
      <div
         className="fixed inset-0 z-40 flex justify-end"
         onClick={handleBackdropClick}
      >
         {/* Backdrop */}
         <div className="absolute inset-0 bg-black/50 animate-fade-in" />

         {/* Panel */}
         <div className="relative w-full sm:w-[380px] h-full bg-surface border-l border-border overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-dim flex items-center justify-center">
                     <Emoji emoji={categoryEmojis[venue.category] || '📍'} size={22} />
                  </div>
                  <h2 className="font-display font-bold text-lg tracking-[-0.3px]">
                     {venue.name}
                  </h2>
               </div>
               <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-text transition-colors cursor-pointer"
                  aria-label="Close panel"
               >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none strokeWidth-2">
                     <line x1="18" y1="6" x2="6" y2="18" />
                     <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
               </button>
            </div>

            {/* Mini Map */}
            <div
               className="h-[180px] relative cursor-pointer group"
               onClick={handleMapClick}
            >
               <div
                  ref={mapContainerRef}
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%' }}
               />
               {/* Click overlay hint */}
               <div className="absolute inset-0 bg-transparent group-hover:bg-white/5 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                     <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none strokeWidth-2">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                     </svg>
                     Open in map
                  </div>
               </div>
            </div>

            {/* Content */}
            <div className="p-5">
               {/* Address */}
               <div className="flex items-start gap-2.5 mb-4">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-muted fill-none strokeWidth-2 shrink-0 mt-0.5">
                     <circle cx="12" cy="10" r="3" />
                     <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 0 1 8-8z" />
                  </svg>
                  <span className="text-sm text-muted">{venue.address}</span>
               </div>

               {/* Description */}
               <p className="text-sm text-text mb-5 leading-relaxed">
                  {venue.description}
               </p>

               {/* Category & Tags */}
               <div className="flex flex-wrap gap-1.5 mb-5">
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${categoryColors[venue.category] || 'bg-surface2 text-muted'}`}>
                     {venue.category.charAt(0).toUpperCase() + venue.category.slice(1)}
                  </span>
                  {venue.vibe_tags?.map((tag) => (
                     <span
                        key={tag}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface2 text-muted"
                     >
                        {tag}
                     </span>
                  ))}
               </div>

               {/* Hours & Rating row */}
               <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center gap-1.5">
                     <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-muted fill-none strokeWidth-2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                     </svg>
                     <span className="text-xs text-muted">{venue.hours}</span>
                  </div>
                  {venue.rating && (
                     <div className="flex items-center gap-1">
                        <div className="flex">
                           {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                 key={i}
                                 viewBox="0 0 24 24"
                                 className={`w-3.5 h-3.5 ${i < Math.floor(venue.rating) ? 'stroke-amber fill-amber' : 'stroke-faint fill-none'} strokeWidth-2`}
                              >
                                 <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                           ))}
                        </div>
                        <span className="text-xs text-muted ml-0.5">{venue.rating}</span>
                     </div>
                  )}
               </div>

               {/* Active events */}
               {venue.activeEvents > 0 && (
                  <div className="bg-teal-dim rounded-[--radius-sm] px-4 py-3 mb-5">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal animate-pulse-dot" />
                        <span className="text-sm font-medium text-teal">
                           {venue.activeEvents} event{venue.activeEvents > 1 ? 's' : ''} happening now
                        </span>
                     </div>
                  </div>
               )}

               {/* Contact info */}
               {(venue.phone || venue.website) && (
                  <div className="border-t border-border pt-4 mt-4">
                     <div className="text-[11px] text-muted uppercase tracking-wider mb-3">Contact</div>
                     <div className="space-y-2">
                        {venue.phone && (
                           <a
                              href={`tel:${venue.phone}`}
                              className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
                           >
                              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none strokeWidth-2">
                                 <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              {venue.phone}
                           </a>
                        )}
                        {venue.website && (
                           <a
                              href={`https://${venue.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-teal hover:underline"
                           >
                              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none strokeWidth-2">
                                 <circle cx="12" cy="12" r="10" />
                                 <line x1="2" y1="12" x2="22" y2="12" />
                                 <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                              {venue.website}
                           </a>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   )
}