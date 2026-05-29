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
  console.log("Seeding City Rides Data...");

  // Seed Routes
  const routes = [
    { start_area: 'CG Road', end_area: 'Maninagar', distance_km: 7.5, base_price: 60, is_active: true },
    { start_area: 'Bopal', end_area: 'SG Highway', distance_km: 5.2, base_price: 45, is_active: true },
    { start_area: 'Naroda', end_area: 'Chandkheda', distance_km: 12.0, base_price: 100, is_active: true }
  ];

  for (const route of routes) {
    await supabase.from('city_routes').insert([route]).select();
  }

  // Fetch a user to use as driver
  const { data: users } = await supabase.from('users').select('id').limit(1);
  const driverId = users && users.length > 0 ? users[0].id : null;

  // Seed Vehicles
  const vehicles = [
    {
      driver_id: driverId,
      vehicle_type: 'Mini Bus',
      license_plate: 'GJ01-AB-1234',
      total_seats: 12,
      available_seats: 12,
      current_lat: 23.0375, // CG Road
      current_lng: 72.5567,
      is_active: true
    },
    {
      driver_id: driverId,
      vehicle_type: 'E-Rickshaw',
      license_plate: 'GJ01-XY-9876',
      total_seats: 4,
      available_seats: 3,
      current_lat: 23.0284, // Satellite
      current_lng: 72.5239,
      is_active: true
    }
  ];

  for (const vehicle of vehicles) {
    await supabase.from('city_vehicles').insert([vehicle]).select();
  }

  console.log("Seeding complete!");
}

seed();
