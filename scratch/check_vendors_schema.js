import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkVendors() {
  const { data, error } = await supabase.from('vendors').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}

checkVendors();
