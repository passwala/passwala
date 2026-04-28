 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function alterTable() {
  const result = await supabase.from('vendors').insert([{
    phone: '9999999991',
    name: 'Test'
  }]);
  console.log("Insert result:", result);
}
alterTable();
