'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { EventCard } from '@/components/events/EventCard'
import { RightPanel } from '@/components/layout/RightPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { VenuePanel } from '@/components/events/VenuePanel'
import { VenueDetailPanel } from '@/components/events/VenueDetailPanel'
import { useAuth } from '@/components/providers/SupabaseProvider'
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
  distance_m: number
  attendee_count: number
  venue_name?: string | null
  location_lat?: number | null
  location_lng?: number | null
}

interface UserLocation {
  lat: number
  lng: number
  name?: string
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music', color: '#7C6EF6' },
  { id: 'food', label: 'Food & drink', color: '#3ecf8e' },
  { id: 'art', label: 'Art', color: '#f5a623' },
  { id: 'sport', label: 'Sport', color: '#4f9cf9' },
  { id: 'social', label: 'Social', color: '#f06449' },
]

const defaultLocation: UserLocation = {
  lat: 40.7231,
  lng: -73.9873,
  name: 'Lower East Side',
}

export default function FeedPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [rightNowFilter, setRightNowFilter] = useState(false)
  const [freeOnlyFilter, setFreeOnlyFilter] = useState(false)

  // Chat state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [attendeeId, setAttendeeId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('You')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null)

  // Track joined events (event_id -> attendee info)
  const [joinedEvents, setJoinedEvents] = useState<Record<string, { attendeeId: string; displayName: string }>>({})

  // Venue detail panel state
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  // Handle venue click from EventCard or VenuePanel
  const handleVenueClick = (venueId: string) => {
    setSelectedVenueId(venueId)
  }

  // Request location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Your location',
          })
        },
        () => {
          // Use default location if permission denied
          setLocation(defaultLocation)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setLocation(defaultLocation)
    }
  }, [])

  // Fetch user's joined events on mount (for authenticated users)
  useEffect(() => {
    if (!user) return

    const fetchJoinedEvents = async () => {
      try {
        const response = await fetch('/api/events/my-attendances')
        if (response.ok) {
          const data = await response.json()
          const joinedMap: Record<string, { attendeeId: string; displayName: string }> = {}
          for (const att of data.attendances || []) {
            joinedMap[att.event_id] = {
              attendeeId: att.attendee_id,
              displayName: att.display_name || user.email?.split('@')[0] || 'You'
            }
          }
          setJoinedEvents(joinedMap)
        }
      } catch (err) {
        console.error('Failed to fetch joined events:', err)
      }
    }

    fetchJoinedEvents()
  }, [user])

  // Fetch events when location changes
  const fetchEvents = useCallback(async () => {
    if (!location) return

    setIsLoading(true)
    setError(null)

    try {
      const category = activeCategory === 'all' ? '' : `&category=${activeCategory}`
      const response = await fetch(
        `/api/events/nearby?lat=${location.lat}&lng=${location.lng}&radius_m=5000${category}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }, [location, activeCategory])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Handle joining an event
  const handleJoin = async (eventId: string) => {
    // If user is authenticated, join directly without modal
    if (user) {
      try {
        const response = await fetch(`/api/events/${eventId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: null }), // API will derive from user
        })

        const data = await response.json()

        if (response.ok) {
          setAttendeeId(data.attendee_id)
          const name = user.email?.split('@')[0] || 'You'
          setDisplayName(name)

          // Track this event as joined
          setJoinedEvents(prev => ({
            ...prev,
            [eventId]: { attendeeId: data.attendee_id, displayName: name }
          }))

          // Set selected event for chat
          const event = events.find((e) => e.id === eventId)
          if (event) {
            setSelectedEvent(event)
          }
        } else {
          // Handle specific error cases
          if (data.error === 'Already joined this event') {
            // This shouldn't happen since we check joinedEvents, but handle gracefully
            // Re-fetch attendances to sync state
            const attResponse = await fetch('/api/events/my-attendances')
            if (attResponse.ok) {
              const attData = await attResponse.json()
              const att = attData.attendances?.find((a: any) => a.event_id === eventId)
              if (att) {
                setAttendeeId(att.attendee_id)
                setDisplayName(att.display_name || user.email?.split('@')[0] || 'You')
                setJoinedEvents(prev => ({
                  ...prev,
                  [eventId]: { attendeeId: att.attendee_id, displayName: att.display_name || name }
                }))
                const event = events.find((e) => e.id === eventId)
                if (event) setSelectedEvent(event)
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to join event:', err)
      }
    } else {
      // Show modal for anonymous join
      setJoiningEventId(eventId)
      setShowJoinModal(true)
    }
  }

  const confirmJoin = async (name: string) => {
    if (!joiningEventId) return

    try {
      const response = await fetch(`/api/events/${joiningEventId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      })

      const data = await response.json()

      if (response.ok) {
        setAttendeeId(data.attendee_id)
        setDisplayName(name)

        // Track this event as joined
        setJoinedEvents(prev => ({
          ...prev,
          [joiningEventId]: { attendeeId: data.attendee_id, displayName: name }
        }))

        // Set selected event for chat
        const event = events.find((e) => e.id === joiningEventId)
        if (event) {
          setSelectedEvent(event)
        }
      }
    } catch (err) {
      console.error('Failed to join event:', err)
    } finally {
      setShowJoinModal(false)
      setJoiningEventId(null)
    }
  }

  const handleEventClick = (eventId: string) => {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      // Check if already joined
      const joinedInfo = joinedEvents[eventId]
      if (joinedInfo) {
        // Already joined - open chat directly
        setAttendeeId(joinedInfo.attendeeId)
        setDisplayName(joinedInfo.displayName)
        setSelectedEvent(event)
      } else {
        // Not joined yet - attempt to join
        handleJoin(eventId)
      }
    }
  }

  // Apply filters to events
  const applyFilters = (eventList: Event[]) => {
    let filtered = eventList

    // Right now filter: only show events that have already started and are still ongoing
    if (rightNowFilter) {
      filtered = filtered.filter((e) => {
        const startsAt = new Date(e.starts_at)
        const endsAt = e.ends_at ? new Date(e.ends_at) : null
        const now = Date.now()
        const hasStarted = startsAt.getTime() <= now
        const hasNotEnded = !endsAt || endsAt.getTime() > now
        return hasStarted && hasNotEnded
      })
    }

    // Free only filter
    if (freeOnlyFilter) {
      filtered = filtered.filter((e) => e.price_label === 'Free')
    }

    return filtered
  }

  // Filter events by time (2-hour threshold for "nearby now" vs "later tonight")
  const allNowEvents = events.filter((e) => {
    const startsAt = new Date(e.starts_at)
    const hoursUntil = (startsAt.getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursUntil <= 2 // Starting within 2 hours or already started
  })

  const allLaterEvents = events.filter((e) => {
    const startsAt = new Date(e.starts_at)
    const hoursUntil = (startsAt.getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursUntil > 2
  })

  // Apply additional filters
  const nowEvents = applyFilters(allNowEvents)
  const laterEvents = rightNowFilter ? [] : applyFilters(allLaterEvents) // Hide later events when "Right now" is active

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Topbar */}
        <div className="sticky top-0 z-10 bg-[rgba(10,10,11,0.85)] backdrop-blur-xl border-b border-border px-7 py-4 flex items-center gap-4">
          <h1 className="font-display font-bold text-xl tracking-[-0.5px] flex-1">
            Now<span className="text-teal">Here</span>
          </h1>
          <button className="flex items-center gap-1.5 bg-surface2 border border-border2 rounded-full px-3 py-1.5 text-xs text-muted cursor-pointer transition-colors hover:border-teal hover:text-text">
            <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-green fill-none strokeWidth-2">
              <circle cx="12" cy="10" r="3" />
              <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 0 1 8-8z" />
            </svg>
            {location?.name || 'Locating...'}
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" title="Live" />
        </div>

        {/* Filter bar */}
        <div className="py-3.5 px-7 flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 bg-surface2 border border-border rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap transition-all ${activeCategory === cat.id
                ? 'bg-teal-dim border-teal text-teal'
                : 'text-muted hover:border-border2 hover:text-text'
                }`}
            >
              {cat.id !== 'all' && (
                <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
              )}
              {cat.label}
            </button>
          ))}
          <button
            onClick={() => setRightNowFilter(!rightNowFilter)}
            className={`flex items-center gap-1.5 bg-surface2 border rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap transition-all ${rightNowFilter
              ? 'bg-teal-dim border-teal text-teal'
              : 'border-border text-muted hover:border-border2 hover:text-text'
              }`}
          >
            <Emoji emoji="🕐" size={12} /> Right now
          </button>
          <button
            onClick={() => setFreeOnlyFilter(!freeOnlyFilter)}
            className={`flex items-center gap-1.5 bg-surface2 border rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap transition-all ${freeOnlyFilter
              ? 'bg-teal-dim border-teal text-teal'
              : 'border-border text-muted hover:border-border2 hover:text-text'
              }`}
          >
            Free only
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted">
            Loading events...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-coral">
            {error}
          </div>
        ) : (
          <>
            {/* Hero event */}
            {nowEvents[0] && (
              <EventCard
                event={nowEvents[0]}
                isHero
                onJoin={handleJoin}
                onClick={handleEventClick}
                onVenueClick={handleVenueClick}
              />
            )}

            {/* Nearby now */}
            {nowEvents.length > 1 && (
              <div className="px-7 pb-6">
                <div className="flex items-baseline justify-between mb-3.5">
                  <h2 className="font-display font-bold text-[15px] tracking-[-0.2px]">
                    Nearby now
                  </h2>
                  <a href="#" className="text-xs text-teal no-underline">See all</a>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                  {nowEvents.slice(1).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onJoin={handleJoin}
                      onClick={handleEventClick}
                      onVenueClick={handleVenueClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Later tonight */}
            {laterEvents.length > 0 && (
              <div className="px-7 pb-6">
                <div className="flex items-baseline justify-between mb-3.5">
                  <h2 className="font-display font-bold text-[15px] tracking-[-0.2px]">
                    Later tonight
                  </h2>
                  <a href="#" className="text-xs text-teal no-underline">See all</a>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                  {laterEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onJoin={handleJoin}
                      onClick={handleEventClick}
                      onVenueClick={handleVenueClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted">
                <div className="mb-4">
                  <Emoji emoji="📍" size={32} />
                </div>
                <p className="text-lg font-semibold mb-2">No events nearby</p>
                <p className="text-sm">Check back later or expand your search radius</p>
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
              displayName={displayName}
            />
          ) : (
            <div className="text-center text-muted text-sm py-8">
              Join an event to start chatting
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

      {/* Join Modal */}
      {showJoinModal && (
        <JoinModal
          onJoin={confirmJoin}
          onClose={() => {
            setShowJoinModal(false)
            setJoiningEventId(null)
          }}
        />
      )}
    </div>
  )
}

function JoinModal({ onJoin, onClose }: { onJoin: (name: string) => void; onClose: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastInitial, setLastInitial] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (firstName && lastInitial) {
      onJoin(`${firstName} ${lastInitial.toUpperCase()}.`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-[--radius] p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl mb-2">Join this event</h2>
        <p className="text-sm text-muted mb-4">{`Enter your name to join the chat. You'll appear as "First L."`}</p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal"
              required
            />
            <input
              type="text"
              placeholder="L"
              value={lastInitial}
              onChange={(e) => setLastInitial(e.target.value.slice(0, 1))}
              className="w-16 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal text-center"
              maxLength={1}
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-surface2 text-muted font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-teal text-white font-semibold"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
