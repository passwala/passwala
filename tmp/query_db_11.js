import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkApp11() {
  const { data, error } = await supabase.from('vendor_applications').select('*').eq('id', 11).single();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('---APP_11_START---');
  console.log(JSON.stringify(data, null, 2));
  console.log('---APP_11_END---');
}

checkApp11();
