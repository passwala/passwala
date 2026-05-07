import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testServiceAreasUpsert() {
  const payload = {
    id: '4f8f065e-3f60-49c0-94c5-50cd50e40efa',
    city: 'Ahmedabad',
    area_name: 'Satellite',
    is_active: true
  };

  const { data, error } = await supabase
    .from('service_areas')
    .upsert(payload, { onConflict: 'id' });

  console.log("Upsert Error:", error);
}

testServiceAreasUpsert();
