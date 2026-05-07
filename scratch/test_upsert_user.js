import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const payload = { phone: '6789876789', full_name: 'Test Name' };
  const { data, error } = await supabase
    .from('users')
    .upsert({
      phone: payload.phone,
      full_name: payload.full_name
    }, { onConflict: 'phone' })
    .select()
    .single();
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
