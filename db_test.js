import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:\\Users\\karan\\OneDrive\\Desktop\\Passwalaa\\.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: addr } = await supabase.from('addresses').select('*').eq('user_id', 'd1c75d89-832d-49bf-9ed5-22a943f1b17c');
  console.log('addresses:', addr);
}

test();
