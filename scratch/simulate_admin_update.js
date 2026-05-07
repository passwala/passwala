import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function simulateAdminUpdate() {
  const payload = {
    id: 'bf3340e4-fa69-4eab-9b5b-d0f4682d93e2',
    user_id: 'a73bead0-ef72-4d88-8e10-581725ea3134',
    phone: '4343434343',
    is_verified: true,
    name: 'vvvvvvv',
    business_name: 'vfvfvfvfvf',
    aadhar_no: '343433434334',
    license_no: '',
    address: 'vfg434',
    category: '',
    second_image_list: '',
    profile_completed: true // Toggling to true like in the screenshot
  };

  console.log("Attempting to update with payload:", payload);

  const { data, error } = await supabase
    .from('vendors')
    .update(payload)
    .eq('id', payload.id);

  console.log("Update Data:", data);
  console.log("Update Error:", error);
}

simulateAdminUpdate();
