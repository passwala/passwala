import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRLS() {
  // Query all service_areas
  const { data, error } = await supabase.from('service_areas').select('*');
  console.log("Service Areas count:", data ? data.length : 0);
  console.log("Service Areas:", data);

  // Attempt to insert a dummy one
  const { data: iData, error: iErr } = await supabase.from('service_areas').insert({
    city: 'Test City',
    area_name: 'Test Area'
  }).select();

  console.log("Insert Error:", iErr);
}

checkRLS();
