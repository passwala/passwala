import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRLS() {
  const { data, error } = await supabase.from('service_areas').select('*').eq('id', '4f8f065e-3f60-49c0-94c5-50cd50e40efa');
  console.log("Current state:", data);
}

checkRLS();
