 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function alterTable() {
  const result = await supabase.from('vendors').insert([{
    phone: '9999999990',
    name: 'Test',
    business_name: 'Test',
    aadhar_no: '123',
    license_no: '123',
    address: 'test',
    category: 'test',
    profile_completed: true,
    second_image_list: '[]'
  }]);
  console.log("Insert result:", result);
}
alterTable();
