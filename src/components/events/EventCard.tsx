'use client'

import { useState } from 'react'
import { Emoji } from '@/components/ui/Emoji'

interface EventCardProps {
   event: {
      id: string
      title: string
      description: string | null
      emoji: string
      category: string | null
      tags: string[] | null
      starts_at: string
      ends_at: string | null
      price_label: string
      address: string | null
      distance_m: number
      attendee_count: number
      venue_name?: string | null
   }
   isHero?: boolean
   onJoin?: (eventId: string) => void
   onClick?: (eventId: string) => void
}

const categoryColors: Record<string, string> = {
   music: 'bg-indigo-dim text-indigo',
   food: 'bg-green-dim text-green',
   art: 'bg-amber-dim text-amber',
   sport: 'bg-[rgba(79,156,249,.12)] text-blue',
   social: 'bg-coral-dim text-coral',
}

const avatarGradients = [
   'from-teal to-blue',
   'from-green to-blue',
   'from-amber to-coral',
]

function formatTime(dateStr: string) {
   const date = new Date(dateStr)
   const hour = date.getHours()
   const ampm = hour >= 12 ? 'pm' : 'am'
   const hour12 = hour % 12 || 12
   return `${hour12}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`
}

function formatDistance(meters: number) {
   if (meters < 160) {
      return `${Math.round(meters * 3.28)} ft`
   }
   return `${(meters / 1609.34).toFixed(1)} mi`
}

function getAvatarInitials(name: string): string {
   if (!name) return '?'
   const parts = name.split(' ')
   if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
   }
   return name.substring(0, 2).toUpperCase()
}

export function EventCard({ event, isHero = false, onJoin, onClick }: EventCardProps) {
   const [isJoining, setIsJoining] = useState(false)

   const handleJoin = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onJoin && !isJoining) {
         setIsJoining(true)
         await onJoin(event.id)
         setIsJoining(false)
      }
   }

   if (isHero) {
      return (
         <div
            className="mx-7 mb-6 rounded-[--radius] bg-surface border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:border-teal hover:-translate-y-0.5"
            onClick={() => onClick?.(event.id)}
         >
            <div className="h-35 bg-gradient-to-br from-[#0f2b26] via-[#1a3d38] to-[#162e3e] flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(91,181,162,0.3)_0%,transparent_60%),radial-gradient(ellipse_at_70%_50%,rgba(79,156,249,0.2)_0%,transparent_60%)]" />
               <div className="relative z-10">
                  <Emoji emoji={event.emoji} size={52} />
               </div>
               <div className="absolute top-3 left-3 bg-teal text-white text-[10px] font-semibold px-2.5 py-1 rounded-full font-display tracking-wider uppercase">
                  {`Tonight's pick`}
               </div>
            </div>
            <div className="p-4">
               <h3 className="font-display text-[19px] font-bold tracking-[-0.4px] mb-1.5">
                  {event.title}
               </h3>
               <div className="text-xs text-muted flex gap-3.5 mb-3">
                  <span className="flex items-center gap-1"><Emoji emoji="📍" size={12} /> {formatDistance(event.distance_m)}</span>
                  <span className="flex items-center gap-1"><Emoji emoji="🕗" size={12} /> {formatTime(event.starts_at)}</span>
                  <span className="flex items-center gap-1"><Emoji emoji="🎟" size={12} /> {event.price_label}</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center">
                     <div className="flex -space-x-2">
                        {Array.from({ length: Math.min(4, event.attendee_count) }).map((_, i) => (
                           <div
                              key={i}
                              className={`w-[26px] h-[26px] rounded-full border-2 border-surface flex items-center justify-center text-[9px] font-semibold bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-white`}
                           >
                              {i === 3 && event.attendee_count > 4 ? `+${event.attendee_count - 3}` : getAvatarInitials(String(i))}
                           </div>
                        ))}
                     </div>
                     <span className="text-xs text-muted ml-2.5">
                        {event.attendee_count} going · chat open
                     </span>
                  </div>
                  <button
                     onClick={handleJoin}
                     disabled={isJoining}
                     className="bg-teal text-white border-none rounded-full px-4.5 py-2 text-[13px] font-semibold font-display cursor-pointer transition-all duration-150 hover:opacity-88 hover:scale-[1.03] disabled:opacity-50"
                  >
                     {isJoining ? 'Joining...' : "I'm going →"}
                  </button>
               </div>
            </div>
         </div>
      )
   }

   return (
      <div
         className="bg-surface border border-border rounded-[--radius] p-4 cursor-pointer transition-all duration-200 hover:border-border2 hover:-translate-y-0.5 relative overflow-hidden group"
         onClick={() => onClick?.(event.id)}
      >
         <div className="mb-2.5">
            <Emoji emoji={event.emoji} size={22} />
         </div>
         <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] mb-1 leading-tight">
            {event.title}
         </h3>
         <p className="text-[11px] text-muted mb-2.5">
            {event.venue_name || 'Self-organised'}{event.address && ` · ${event.address}`}
         </p>
         <div className="flex flex-wrap gap-1.5 mb-3">
            {event.category && (
               <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColors[event.category] || 'bg-surface2 text-muted'}`}>
                  {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
               </span>
            )}
            {event.tags?.slice(0, 2).map((tag) => (
               <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-dim text-green">
                  {tag}
               </span>
            ))}
            {event.price_label === 'Free' && (
               <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-dim text-green">
                  Free
               </span>
            )}
         </div>
         <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted flex flex-col gap-0.5">
               <span>{formatTime(event.starts_at)} · {formatDistance(event.distance_m)}</span>
               <span className={event.attendee_count > 5 ? 'text-green' : 'text-muted'}>
                  {event.attendee_count} going
               </span>
            </div>
            {event.attendee_count > 0 ? (
               <div className="text-[11px] text-teal bg-teal-glow px-2 py-1 rounded-full flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none strokeWidth-2">
                     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Chat open
               </div>
            ) : (
               <div className="text-[11px] font-semibold bg-surface2 text-muted px-2 py-1 rounded-full">
                  {event.price_label}
               </div>
            )}
         </div>
      </div>
   )
}