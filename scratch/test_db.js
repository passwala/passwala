import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('Testing connection to:', process.env.SUPABASE_URL);
  const { data, error } = await supabase.from('users').select('id, full_name').limit(5);
  if (error) {
    console.error('Test Error:', error);
  } else {
    console.log('Found users:', data);
  }
}

test();
