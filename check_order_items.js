import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  if (error) {
    console.error('Error fetching order_items:', error.message);
  } else {
    console.log('Order items table exists. Data:', data);
  }
}
check();
