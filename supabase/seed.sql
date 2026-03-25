-- Seed data for NowHere app (Lower East Side, NYC area)

-- Insert venues
insert into venues (id, name, email, address, location, category, vibe_tags, verified) values
(
  '11111111-1111-1111-1111-111111111111',
  'Nublu',
  'nublu@nublu.com',
  '151 Ave C, New York, NY 10009',
  ST_SetSRID(ST_MakePoint(-73.9814, 40.7264), 4326)::geography,
  'music',
  array['jazz', 'late night', 'electronic'],
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  'Mercury Lounge',
  'events@mercurylounge.net',
  '217 E Houston St, New York, NY 10002',
  ST_SetSRID(ST_MakePoint(-73.9876, 40.7214), 4326)::geography,
  'music',
  array['indie', 'rock', 'intimate'],
  true
),
(
  '33333333-3333-3333-3333-333333333333',
  'The Slipper Room',
  'events@slipperroom.com',
  '167 Orchard St, New York, NY 10002',
  ST_SetSRID(ST_MakePoint(-73.9885, 40.7198), 4326)::geography,
  'music',
  array['cabaret', 'live music', 'burlesque'],
  true
),
(
  '44444444-4444-4444-4444-444444444444',
  'Howl Arts Collective',
  'hello@howlarts.org',
  '6 E 1st St, New York, NY 10003',
  ST_SetSRID(ST_MakePoint(-73.9921, 40.7231), 4326)::geography,
  'art',
  array['creative', 'workshop', 'community'],
  true
),
(
  '55555555-5555-5555-5555-555555555555',
  'Neighbours Bar',
  'neighbours@neighborsbar.com',
  '438 E 9th St, New York, NY 10009',
  ST_SetSRID(ST_MakePoint(-73.9823, 40.7276), 4326)::geography,
  'social',
  array['trivia', 'neighborhood', 'chill'],
  true
),
(
  '66666666-6666-6666-6666-666666666666',
  'Seward Park Courts',
  'parks@parks.nyc.gov',
  'Seward Park, Essex St, New York, NY 10002',
  ST_SetSRID(ST_MakePoint(-73.9901, 40.7156), 4326)::geography,
  'sport',
  array['basketball', 'outdoor', 'pickup'],
  true
);

-- Insert events
insert into events (id, venue_id, title, description, emoji, category, tags, starts_at, ends_at, price_label, location, address, status, source) values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Late Night Jazz at Nublu',
  'Free jazz sessions with rotating artists. Late night vibes.',
  '🎷',
  'music',
  array['jazz', 'late night', 'free entry'],
  now() + interval '2 hours',
  now() + interval '6 hours',
  'Free',
  ST_SetSRID(ST_MakePoint(-73.9814, 40.7264), 4326)::geography,
  '151 Ave C',
  'live',
  'email'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  null,
  'East Village Ramen Crawl',
  'Self-organized food crawl. Meet at Noodle St and explore ramen spots!',
  '🍜',
  'food',
  array['ramen', 'social', 'free'],
  now() + interval '1 hour',
  now() + interval '4 hours',
  'Free',
  ST_SetSRID(ST_MakePoint(-73.9856, 40.7278), 4326)::geography,
  'Est. Noodle St',
  'live',
  'manual'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '44444444-4444-4444-4444-444444444444',
  'Acrylics & Wine — Open Studio',
  'Casual painting session with wine. Materials provided.',
  '🎨',
  'art',
  array['painting', 'workshop', 'social'],
  now() + interval '30 minutes',
  now() + interval '3 hours',
  '$10',
  ST_SetSRID(ST_MakePoint(-73.9921, 40.7231), 4326)::geography,
  '6 E 1st St',
  'live',
  'email'
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '66666666-6666-6666-6666-666666666666',
  'Pickup 5-on-5 Basketball',
  'Open run at Seward Park. Need players!',
  '🏀',
  'sport',
  array['basketball', 'pickup', 'outdoor'],
  now() - interval '30 minutes',
  now() + interval '2 hours',
  'Free',
  ST_SetSRID(ST_MakePoint(-73.9901, 40.7156), 4326)::geography,
  'Seward Park Courts',
  'live',
  'manual'
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '55555555-5555-5555-5555-555555555555',
  'Trivia Night — Neighbours Bar',
  'Weekly trivia with prizes. Teams of up to 4.',
  '🍺',
  'social',
  array['trivia', 'bar', 'prizes'],
  now() + interval '3 hours',
  now() + interval '5 hours',
  'Free',
  ST_SetSRID(ST_MakePoint(-73.9823, 40.7276), 4326)::geography,
  '438 E 9th St',
  'live',
  'email'
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '33333333-3333-3333-3333-333333333333',
  'Open Mic — The Slipper Room',
  'Weekly open mic night. Sign up early!',
  '🎤',
  'music',
  array['open mic', 'live music', 'performance'],
  now() + interval '4 hours',
  now() + interval '7 hours',
  'Free',
  ST_SetSRID(ST_MakePoint(-73.9885, 40.7198), 4326)::geography,
  '167 Orchard St',
  'live',
  'email'
),
(
  '10101010-1010-1010-1010-101010101010',
  '22222222-2222-2222-2222-222222222222',
  'Mercury Lounge — Indie showcase',
  'Three indie bands. Doors at 9pm.',
  '🎸',
  'music',
  array['indie', 'rock', 'concert'],
  now() + interval '5 hours',
  now() + interval '8 hours',
  '$15',
  ST_SetSRID(ST_MakePoint(-73.9876, 40.7214), 4326)::geography,
  '217 E Houston St',
  'live',
  'email'
),
(
  '20202020-2020-2020-2020-202020202020',
  null,
  'Late Night Taco Pop-up',
  'Street tacos on Delancey. Cash only.',
  '🌮',
  'food',
  array['tacos', 'street food', 'late night'],
  now() + interval '6 hours',
  now() + interval '9 hours',
  '$',
  ST_SetSRID(ST_MakePoint(-73.9898, 40.7186), 4326)::geography,
  'Delancey St corner',
  'live',
  'manual'
);

-- Insert sample attendees
insert into attendees (id, event_id, display_name, joined_at) values
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Jamie K.',
  now() - interval '1 hour'
),
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Marco S.',
  now() - interval '45 minutes'
),
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Priya R.',
  now() - interval '30 minutes'
),
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Alex T.',
  now() - interval '20 minutes'
),
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Jordan M.',
  now() - interval '10 minutes'
),
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Taylor W.',
  now() - interval '5 minutes'
),
(
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Casey L.',
  now()
),
(
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Dana P.',
  now() - interval '20 minutes'
),
(
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Riley K.',
  now() - interval '15 minutes'
),
(
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Morgan F.',
  now() - interval '10 minutes'
),
(
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Quinn S.',
  now() - interval '5 minutes'
),
(
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Avery J.',
  now()
),
(
  gen_random_uuid(),
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Blake H.',
  now() - interval '15 minutes'
),
(
  gen_random_uuid(),
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Reese N.',
  now() - interval '10 minutes'
);

-- Insert sample messages
insert into messages (event_id, attendee_id, display_name, body, created_at) values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from attendees where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and display_name = 'Jamie K.' limit 1),
  'Jamie K.',
  'Anyone know if there''s a cover tonight?',
  now() - interval '25 minutes'
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from attendees where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and display_name = 'Marco S.' limit 1),
  'Marco S.',
  'Free until 9 I think! Saw it on their IG',
  now() - interval '20 minutes'
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from attendees where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and display_name = 'Priya R.' limit 1),
  'Priya R.',
  'Grabbing a drink first — meet by the bar?',
  now() - interval '10 minutes'
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from attendees where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and display_name = 'Marco S.' limit 1),
  'Marco S.',
  'I''ll be the one in the green jacket 😄',
  now() - interval '5 minutes'
);

-- Note: Email queue items are not seeded as they should come from real inbound emails
-- Use the /api/inbound-email endpoint to test the email ingestion flow