
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  const { data, error } = await supabase.from('services').select('*');
  
  if (error) {
    console.error('Error fetching services:', error);
  } else {
    console.log('Successfully fetched services:', data);
  }
}

test();
