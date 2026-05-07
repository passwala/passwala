import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkServiceAreas() {
  const { data, error } = await supabase.from('service_areas').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}

checkServiceAreas();
