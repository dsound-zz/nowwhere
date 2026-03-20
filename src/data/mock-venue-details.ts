export interface VenueDetail {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  vibe_tags: string[]
  description: string
  hours: string
  rating: number
  activeEvents: number
  phone?: string
  website?: string
}

// Mock venue details - enriched from seed-venues.json
export const mockVenueDetails: VenueDetail[] = [
  {
    id: 'venue-nublu',
    name: 'Nublu',
    address: '151 Ave C, New York, NY 10009',
    lat: 40.7264,
    lng: -73.9814,
    category: 'music',
    vibe_tags: ['jazz', 'late night', 'electronic'],
    description: 'Intimate downtown staple featuring avant-garde jazz, electronic, and world music. No-frills atmosphere with a devoted local following.',
    hours: 'Open until 2am',
    rating: 4.5,
    activeEvents: 2,
    phone: '(212) 477-6992',
    website: 'nublu.net',
  },
  {
    id: 'venue-mercury-lounge',
    name: 'Mercury Lounge',
    address: '217 E Houston St, New York, NY 10002',
    lat: 40.7214,
    lng: -73.9876,
    category: 'music',
    vibe_tags: ['indie', 'rock', 'intimate'],
    description: 'Classic Lower East Side venue known for breaking indie bands. Tight room, great sound, and that authentic NYC rock club feel.',
    hours: 'Open until 1am',
    rating: 4.3,
    activeEvents: 1,
    phone: '(212) 260-4700',
    website: 'mercuryloungenyc.com',
  },
  {
    id: 'venue-slipper-room',
    name: 'The Slipper Room',
    address: '167 Orchard St, New York, NY 10002',
    lat: 40.7198,
    lng: -73.9885,
    category: 'music',
    vibe_tags: ['cabaret', 'live music', 'burlesque'],
    description: 'Glamorous two-level venue with cabaret, burlesque, and live music. Vintage decor and craft cocktails complete the experience.',
    hours: 'Open until 4am',
    rating: 4.4,
    activeEvents: 3,
    phone: '(212) 254-7888',
    website: 'slipperroomnyc.com',
  },
  {
    id: 'venue-rockwood',
    name: 'Rockwood Music Hall',
    address: '196 Allen St, New York, NY 10002',
    lat: 40.7218,
    lng: -73.9892,
    category: 'music',
    vibe_tags: ['indie', 'acoustic', 'emerging artists'],
    description: 'Three stages of live music spanning indie, folk, and experimental. A rite of passage for NYC\'s emerging artist scene.',
    hours: 'Open until 2am',
    rating: 4.6,
    activeEvents: 2,
    website: 'rockwoodmusichall.com',
  },
  {
    id: 'venue-pianos',
    name: 'Pianos',
    address: '158 Ludlow St, New York, NY 10002',
    lat: 40.7215,
    lng: -73.9881,
    category: 'music',
    vibe_tags: ['rock', 'indie', 'dance'],
    description: 'Two floors of live music and DJ sets with a laid-back bar vibe. Popular spot for late-night dancing on weekends.',
    hours: 'Open until 4am',
    rating: 3.9,
    activeEvents: 1,
    phone: '(212) 505-3733',
    website: 'pianosnyc.com',
  },
  {
    id: 'venue-arlenes',
    name: "Arlene's Grocery",
    address: '95 Stanton St, New York, NY 10002',
    lat: 40.722,
    lng: -73.9877,
    category: 'music',
    vibe_tags: ['punk', 'rock', 'open mic'],
    description: 'Former bodega turned legendary rock venue. Raw energy, cheap drinks, and authentic downtown grit since 1995.',
    hours: 'Open until 2am',
    rating: 4.2,
    activeEvents: 1,
    phone: '(212) 995-1652',
    website: 'arlenesgrocery.net',
  },
  {
    id: 'venue-howl',
    name: 'Howl Arts',
    address: '6 E 1st St, New York, NY 10003',
    lat: 40.723,
    lng: -73.993,
    category: 'art',
    vibe_tags: ['gallery', 'experimental', 'underground'],
    description: 'Artist-run gallery and performance space in the heart of the East Village. Experimental exhibitions, poetry readings, and avant-garde performances.',
    hours: 'Open until 10pm',
    rating: 4.7,
    activeEvents: 1,
    website: 'howlarts.org',
  },
  {
    id: 'venue-neighbours',
    name: 'Neighbours Bar',
    address: '424 E 9th St, New York, NY 10009',
    lat: 40.7278,
    lng: -73.9796,
    category: 'social',
    vibe_tags: ['dive bar', 'neighborhood', 'laid-back'],
    description: 'Unpretentious East Village corner bar with pool tables, cheap drinks, and a friendly local crowd. The kind of place where everyone eventually knows your name.',
    hours: 'Open until 4am',
    rating: 4.0,
    activeEvents: 1,
  },
  {
    id: 'venue-seward-park',
    name: 'Seward Park Courts',
    address: 'Seward Park, Essex St, New York, NY 10002',
    lat: 40.7145,
    lng: -73.9879,
    category: 'sport',
    vibe_tags: ['basketball', 'outdoor', 'pickup games'],
    description: 'Popular pickup basketball spot in the historic Seward Park. Games run from dawn to dusk, all skill levels welcome.',
    hours: 'Open until dusk',
    rating: 4.1,
    activeEvents: 0,
  },
  {
    id: 'venue-katzs',
    name: "Katz's Delicatessen",
    address: '205 E Houston St, New York, NY 10002',
    lat: 40.7223,
    lng: -73.9874,
    category: 'food',
    vibe_tags: ['iconic', 'deli', 'late night'],
    description: 'NYC institution since 1888. Famous for hand-carved pastrami and that iconic sign. Must-try for any visitor or local.',
    hours: 'Open 24 hours',
    rating: 4.5,
    activeEvents: 0,
    phone: '(212) 254-2246',
    website: 'katzsdelicatessen.com',
  },
]

// Helper to get venue by ID
export function getVenueById(id: string): VenueDetail | undefined {
  return mockVenueDetails.find((v) => v.id === id)
}

// Helper to get venue by name (fuzzy match for EventCard venue_name)
export function getVenueByName(name: string): VenueDetail | undefined {
  const normalizedName = name.toLowerCase().trim()
  return mockVenueDetails.find((v) => 
    v.name.toLowerCase().includes(normalizedName) || 
    normalizedName.includes(v.name.toLowerCase())
  )
}

// Category emojis for display
export const categoryEmojis: Record<string, string> = {
  music: '🎷',
  food: '🍜',
  art: '🎨',
  sport: '🏀',
  social: '🎤',
}