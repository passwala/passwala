import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkEmptyPhone() {
  const { data, error } = await supabase.from('vendors').insert({
    phone: '',
    name: 'Test Vendor Empty Phone 2'
  });
  console.log("Error inserting empty phone:", error);
}

checkEmptyPhone();
