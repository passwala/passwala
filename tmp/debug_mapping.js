 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users } = await supabase.from('users').select('*');
  console.log('Users:', JSON.stringify(users, null, 2));

  const { data: apps } = await supabase.from('vendor_applications').select('*').eq('phone', '');
  console.log('Empty Phone Applications:', JSON.stringify(apps, null, 2));
}

run();
