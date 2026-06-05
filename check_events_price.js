import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('add_starting_price_to_events', {});
  if (error) {
    console.log('RPC failed. Falling back to simple query to add column.');
    const { data: d2, error: e2 } = await supabase.from('events').select('starting_price').limit(1);
    if (e2 && e2.message.includes('starting_price')) {
      console.log('Column does not exist. Need to add it manually or via psql.');
    } else {
      console.log('Column already exists or another error:', e2 || d2);
    }
  }
}
check();
