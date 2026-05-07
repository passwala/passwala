import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkVendorRLS() {
  const { data, error } = await supabase.from('vendors').select('*').eq('id', 'bf3340e4-fa69-4eab-9b5b-d0f4682d93e2');
  console.log("Current state:", data);
}

checkVendorRLS();
