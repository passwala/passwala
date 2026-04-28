import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testUpsert() {
      const payload = {
          phone: '+919999999999',
          full_name: 'Test Buyer',
          email: 'testbuyer@example.com',
          photo_url: ''
      };
      const { data, error } = await supabase.from('users').upsert([payload]);
      console.log('Error:', error);
      console.log('Data:', data);
}
testUpsert();
