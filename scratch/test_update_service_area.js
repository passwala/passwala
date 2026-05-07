import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function simulateServiceAreaUpdate() {
  const payload = {
    id: '4f8f065e-3f60-49c0-94c5-50cd50e40efa',
    city: 'Ahmedabad',
    area_name: 'Satellite',
    is_active: false // Toggling it
  };

  console.log("Attempting to update with payload:", payload);

  const { data, error } = await supabase
    .from('service_areas')
    .update(payload)
    .eq('id', payload.id);

  console.log("Update Data:", data);
  console.log("Update Error:", error);
}

simulateServiceAreaUpdate();
