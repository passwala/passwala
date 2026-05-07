import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function simulateAdminUpdate() {
  const payload = {
    id: 'bf3340e4-fa69-4eab-9b5b-d0f4682d93e2',
    user_id: '', // Empty string instead of null
    phone: '4343434343',
    is_verified: true,
  };

  const { data, error } = await supabase
    .from('vendors')
    .update(payload)
    .eq('id', payload.id);

  console.log("Update Error with empty user_id:", error);
}

simulateAdminUpdate();
