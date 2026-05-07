import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUpdate() {
  const { data, error } = await supabase.from('vendors').update({
    is_verified: true,
    profile_completed: false
  }).eq('id', 'bf3340e4-fa69-4eab-9b5b-d0f4682d93e2');
  console.log("Error updating:", error);
}

checkUpdate();
