import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkEmptyPhone() {
  const { data, error } = await supabase.from('vendors').upsert({
    phone: '',
    name: 'Test Vendor Empty Phone'
  }, { onConflict: 'phone' }); // Actually vendors primary key is id, but phone is unique
  console.log("Error inserting empty phone:", error);
}

checkEmptyPhone();
