import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixDB() {
  // Move Mahadev back to actual Paldi coords
  const {error: e1} = await supabase.from('stores').update({lat: 23.0113, lng: 72.5634, address: 'Paldi, Ahmedabad'}).eq('name', 'Mahadev');
  console.log("Store update:", e1);
}
fixDB();
