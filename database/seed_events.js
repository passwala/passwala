import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding Events Data...");

  const { data: users } = await supabase.from('users').select('id').limit(1);
  const adminId = users && users.length > 0 ? users[0].id : null;

  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 5);

  const events = [
    {
      title: 'A.R. Rahman Live in Ahmedabad',
      description: 'Experience the magic of A.R. Rahman live in concert.',
      category: 'Music Concerts',
      venue_name: 'Narendra Modi Stadium',
      venue_lat: 23.0917,
      venue_lng: 72.5973,
      event_date: upcomingDate.toISOString(),
      banner_url: 'https://images.unsplash.com/photo-1540039155732-684736f16b5a?w=1200&q=80',
      status: 'UPCOMING',
      created_by: adminId
    },
    {
      title: 'Zakir Khan Standup Special',
      description: 'Tathastu - An unforgettable comedy experience.',
      category: 'Comedy Shows',
      venue_name: 'Tagore Hall',
      venue_lat: 23.0189,
      venue_lng: 72.5714,
      event_date: upcomingDate.toISOString(),
      banner_url: 'https://images.unsplash.com/photo-1527224857830-43a7ebb8545e?w=1200&q=80',
      status: 'UPCOMING',
      created_by: adminId
    }
  ];

  for (const ev of events) {
    const { data: insertedEvent, error } = await supabase.from('events').insert([ev]).select().single();
    if (error) {
      console.error("Error inserting event:", error.message);
      continue;
    }

    const tiers = [
      { event_id: insertedEvent.id, tier_name: 'VIP', price: 5000, total_seats: 50, available_seats: 50 },
      { event_id: insertedEvent.id, tier_name: 'Premium', price: 2500, total_seats: 200, available_seats: 200 },
      { event_id: insertedEvent.id, tier_name: 'Normal', price: 999, total_seats: 500, available_seats: 500 }
    ];

    await supabase.from('event_ticket_tiers').insert(tiers);
  }

  console.log("Seeding Events complete!");
}

seed();
