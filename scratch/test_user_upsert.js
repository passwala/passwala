import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testUserUpsert() {
  const userPayload = {
    full_name: 'Admin Created',
    phone: '4343434343'
  };
  
  const res = await supabase.from('users').upsert(userPayload, { onConflict: 'phone' }).select().single();
  console.log("User Upsert Error:", res.error);
}

testUserUpsert();
