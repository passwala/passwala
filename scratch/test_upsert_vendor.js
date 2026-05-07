import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUpsert() {
  const { data, error } = await supabase.from('vendors').upsert({
    id: 'bf3340e4-fa69-4eab-9b5b-d0f4682d93e2',
    is_verified: true,
    profile_completed: false
  }, { onConflict: 'id' });
  console.log("Error upserting:", error);
}

checkUpsert();
