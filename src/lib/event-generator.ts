// Event generator for dev seeding
// Generates realistic events with time-relative starts_at/ends_at

export interface SeedVenue {
  name: string
  address: string
  lat: number
  lng: number
  category: 'music' | 'food' | 'art' | 'sport' | 'social'
  vibe_tags: string[]
}

export interface GeneratedEvent {
  title: string
  description: string
  emoji: string
  category: string
  tags: string[]
  starts_at: string
  ends_at: string
  price_label: string
}

interface EventTemplate {
  title: string
  description: string
  emoji: string
  tags: string[]
  price_label?: string
}

const eventTemplates: Record<string, EventTemplate[]> = {
  music: [
    { title: 'Live Jazz', description: 'Smooth jazz with rotating artists. Late night vibes.', emoji: '🎷', tags: ['jazz', 'live music', 'late night'] },
    { title: 'DJ Night', description: 'Electronic beats all night. Come dance!', emoji: '🎧', tags: ['dj', 'electronic', 'dance'] },
    { title: 'Open Mic Night', description: 'Weekly open mic. Sign up early!', emoji: '🎤', tags: ['open mic', 'performance', 'community'], price_label: 'Free' },
    { title: 'Indie Rock Showcase', description: 'Three local bands. Doors at 8pm.', emoji: '🎸', tags: ['indie', 'rock', 'concert'] },
    { title: 'Acoustic Sessions', description: 'Intimate acoustic performances.', emoji: '🎻', tags: ['acoustic', 'intimate', 'singer-songwriter'] },
    { title: 'Punk Night', description: 'Fast, loud, and unapologetic.', emoji: '🤘', tags: ['punk', 'rock', 'hardcore'] },
    { title: 'Electronic Underground', description: 'Deep house and techno until sunrise.', emoji: '⚡', tags: ['electronic', 'techno', 'underground'] },
    { title: 'Hip Hop Cypher', description: 'Open freestyle session. Bring your bars.', emoji: '🎤', tags: ['hip hop', 'freestyle', 'rap'], price_label: 'Free' },
  ],
  food: [
    { title: 'Happy Hour', description: 'Half off drinks and apps. 5-7pm daily.', emoji: '🍺', tags: ['happy hour', 'drinks', 'specials'], price_label: 'Free' },
    { title: 'Taco Tuesday', description: '$2 tacos and margaritas all night.', emoji: '🌮', tags: ['tacos', 'specials', 'mexican'], price_label: '$' },
    { title: 'Ramen Night', description: 'Special ramen bowls with seasonal ingredients.', emoji: '🍜', tags: ['ramen', 'japanese', 'noodles'], price_label: '$' },
    { title: 'Wine & Cheese Tasting', description: 'Curated selection of wines and artisan cheeses.', emoji: '🍷', tags: ['wine', 'cheese', 'tasting'], price_label: '$$' },
    { title: 'Sunday Brunch', description: 'Bottomless mimosas and live music.', emoji: '🥞', tags: ['brunch', 'mimosas', 'weekend'], price_label: '$$' },
    { title: 'Food Crawl Meetup', description: 'Self-organized food tour. Meet at the spot!', emoji: '🍕', tags: ['food crawl', 'social', 'meetup'], price_label: 'Free' },
    { title: 'Dumpling Workshop', description: 'Learn to make authentic dumplings.', emoji: '🥟', tags: ['workshop', 'cooking', 'dumplings'], price_label: '$15' },
    { title: 'Street Food Pop-up', description: 'Late night street tacos. Cash only.', emoji: '🌮', tags: ['street food', 'late night', 'tacos'], price_label: '$' },
  ],
  art: [
    { title: 'Gallery Opening', description: 'New exhibition opening with wine reception.', emoji: '🎨', tags: ['gallery', 'opening', 'contemporary'], price_label: 'Free' },
    { title: 'Art Workshop', description: 'Painting session with materials provided.', emoji: '🖌️', tags: ['workshop', 'painting', 'creative'], price_label: '$20' },
    { title: 'Artist Talk', description: 'Q&A with local artists about their process.', emoji: '🗣️', tags: ['talk', 'artists', 'community'], price_label: 'Free' },
    { title: 'Life Drawing Session', description: 'Open figure drawing. All levels welcome.', emoji: '✏️', tags: ['drawing', 'figure', 'practice'], price_label: '$10' },
    { title: 'Printmaking Workshop', description: 'Learn screen printing techniques.', emoji: '🖼️', tags: ['printmaking', 'workshop', 'hands-on'], price_label: '$25' },
    { title: 'Poetry Reading', description: 'Open mic poetry night with featured readers.', emoji: '📖', tags: ['poetry', 'reading', 'open mic'], price_label: 'Free' },
    { title: 'Film Screening', description: 'Independent films + director Q&A.', emoji: '🎬', tags: ['film', 'screening', 'independent'], price_label: '$5' },
  ],
  sport: [
    { title: 'Pickup Basketball', description: 'Open run at the courts. Need players!', emoji: '🏀', tags: ['basketball', 'pickup', 'outdoor'], price_label: 'Free' },
    { title: 'Morning Yoga', description: 'Outdoor yoga session. Bring your own mat.', emoji: '🧘', tags: ['yoga', 'outdoor', 'wellness'], price_label: 'Free' },
    { title: 'Running Club', description: '5K loop through the neighborhood.', emoji: '🏃', tags: ['running', 'fitness', 'group'], price_label: 'Free' },
    { title: 'Climbing Session', description: 'Open climbing for all skill levels.', emoji: '🧗', tags: ['climbing', 'fitness', 'indoor'], price_label: '$20' },
    { title: 'Boxing Class', description: 'Beginner-friendly boxing fundamentals.', emoji: '🥊', tags: ['boxing', 'fitness', 'class'], price_label: '$15' },
    { title: 'Bike Ride', description: 'Group ride along the waterfront.', emoji: '🚴', tags: ['biking', 'outdoor', 'group'], price_label: 'Free' },
    { title: 'Soccer Pickup', description: 'Casual 5v5 game. All ages welcome.', emoji: '⚽', tags: ['soccer', 'pickup', 'outdoor'], price_label: 'Free' },
  ],
  social: [
    { title: 'Trivia Night', description: 'Weekly trivia with prizes. Teams of up to 4.', emoji: '🧠', tags: ['trivia', 'games', 'prizes'], price_label: 'Free' },
    { title: 'Speed Networking', description: 'Meet local professionals and creatives.', emoji: '🤝', tags: ['networking', 'professional', 'meetup'], price_label: 'Free' },
    { title: 'Game Night', description: 'Board games and beer. Bring your favorites!', emoji: '🎲', tags: ['games', 'board games', 'social'], price_label: 'Free' },
    { title: 'Karaoke Night', description: 'Private rooms available. Walk-ins welcome.', emoji: '🎤', tags: ['karaoke', 'singing', 'fun'], price_label: 'Free' },
    { title: 'Comedy Open Mic', description: 'Try your 5 minutes. Supportive crowd.', emoji: '😂', tags: ['comedy', 'open mic', 'standup'], price_label: 'Free' },
    { title: 'Pub Quiz', description: 'Themed trivia night with drink specials.', emoji: '🍻', tags: ['trivia', 'pub', 'teams'], price_label: 'Free' },
    { title: 'Singles Mixer', description: 'Casual meet-and-greet for singles.', emoji: '💕', tags: ['dating', 'singles', 'social'], price_label: '$10' },
    { title: 'Book Club', description: 'Monthly meetup to discuss this month\'s pick.', emoji: '📚', tags: ['books', 'discussion', 'community'], price_label: 'Free' },
  ],
}

const attendeeNames = [
  'Alex T.', 'Jamie K.', 'Marco S.', 'Priya R.', 'Jordan M.', 'Taylor W.',
  'Casey L.', 'Dana P.', 'Riley K.', 'Morgan F.', 'Quinn S.', 'Avery J.',
  'Blake H.', 'Reese N.', 'Drew C.', 'Sage P.', 'River M.', 'Skylar D.',
  'Phoenix L.', 'Rowan K.', 'Micah S.', 'Ellis B.', 'Kai W.', 'Finley R.',
]

const chatMessages = [
  'Anyone know if there\'s a cover tonight?',
  'Just got here! Where is everyone?',
  'Grabbing a drink first — meet by the bar?',
  'I\'ll be the one in the green jacket 😄',
  'Running 10 mins late!',
  'Is there street parking nearby?',
  'First time here, excited!',
  'Who else is coming from Brooklyn?',
  'This place is great!',
  'Can\'t wait to meet everyone',
  'I\'m here early, saved a table',
  'Anyone want to share an Uber?',
  'Weather is perfect for this',
  'Bringing a friend, hope that\'s cool!',
  'See you all soon!',
]

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate event start/end times relative to now
function generateEventTimes(): { starts_at: Date; ends_at: Date } {
  const now = new Date()
  const rand = Math.random()

  if (rand < 0.3) {
    // 30%: Already started (happening now)
    const hoursAgo = randomInt(0, 120) / 60 // 0-2 hours ago
    const starts_at = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    const duration = randomInt(2, 5) // 2-5 hours total
    const ends_at = new Date(starts_at.getTime() + duration * 60 * 60 * 1000)
    return { starts_at, ends_at }
  } else if (rand < 0.7) {
    // 40%: Starting soon / tonight (0-3 hours)
    const hoursFromNow = randomInt(0, 180) / 60 // 0-3 hours
    const starts_at = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000)
    const duration = randomInt(2, 4)
    const ends_at = new Date(starts_at.getTime() + duration * 60 * 60 * 1000)
    return { starts_at, ends_at }
  } else {
    // 30%: Later tonight (3-8 hours)
    const hoursFromNow = randomInt(180, 480) / 60 // 3-8 hours
    const starts_at = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000)
    const duration = randomInt(2, 5)
    const ends_at = new Date(starts_at.getTime() + duration * 60 * 60 * 1000)
    return { starts_at, ends_at }
  }
}

export function generateEvent(venue: SeedVenue): GeneratedEvent {
  const templates = eventTemplates[venue.category] || eventTemplates.social
  const template = randomChoice(templates)

  const { starts_at, ends_at } = generateEventTimes()

  // Determine price if not set in template
  let price_label = template.price_label || 'Free'
  if (!template.price_label) {
    const rand = Math.random()
    if (rand < 0.5) price_label = 'Free'
    else if (rand < 0.7) price_label = '$'
    else if (rand < 0.85) price_label = '$$'
    else price_label = `$${randomInt(10, 25)}`
  }

  // Merge venue vibe_tags with template tags
  const allTags = Array.from(new Set([...template.tags, ...venue.vibe_tags.slice(0, 2)]))
  const tags = allTags.slice(0, 5)

  return {
    title: `${template.title} at ${venue.name}`,
    description: template.description,
    emoji: template.emoji,
    category: venue.category,
    tags,
    starts_at: starts_at.toISOString(),
    ends_at: ends_at.toISOString(),
    price_label,
  }
}

export interface GeneratedAttendee {
  display_name: string
}

export function generateAttendees(eventStartsAt: string): GeneratedAttendee[] {
  const starts = new Date(eventStartsAt)
  const now = new Date()
  const hoursUntil = (starts.getTime() - now.getTime()) / (1000 * 60 * 60)

  let count: number
  if (hoursUntil < 0) {
    // Event already started
    count = randomInt(3, 15)
  } else if (hoursUntil < 3) {
    // Starting soon
    count = randomInt(1, 8)
  } else {
    // Later tonight
    count = randomInt(0, 3)
  }

  const attendees: GeneratedAttendee[] = []
  const usedNames = new Set<string>()

  for (let i = 0; i < count; i++) {
    let name = randomChoice(attendeeNames)
    while (usedNames.has(name)) {
      name = randomChoice(attendeeNames)
    }
    usedNames.add(name)
    attendees.push({ display_name: name })
  }

  return attendees
}

export interface GeneratedMessage {
  display_name: string
  body: string
  created_at: string
}

export function generateMessages(
  attendees: GeneratedAttendee[],
  eventStartsAt: string
): GeneratedMessage[] {
  // Only generate messages if event has 3+ attendees
  if (attendees.length < 3) return []

  const messageCount = randomInt(2, Math.min(6, attendees.length * 2))
  const messages: GeneratedMessage[] = []
  const starts = new Date(eventStartsAt)
  const now = new Date()

  for (let i = 0; i < messageCount; i++) {
    const attendee = randomChoice(attendees)
    const body = randomChoice(chatMessages)

    // Messages are sent between 1 hour ago and 5 minutes ago
    const minutesAgo = randomInt(5, 60)
    const created_at = new Date(now.getTime() - minutesAgo * 60 * 1000)

    messages.push({
      display_name: attendee.display_name,
      body,
      created_at: created_at.toISOString(),
    })
  }

  // Sort by created_at
  messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return messages
}
