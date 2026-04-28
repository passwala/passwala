 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkApp11() {
  const { data, error } = await supabase.from('vendor_applications').select('*').eq('id', 11).single();
  if (error) {
    console.error('Error:', error);
    return;
  }
  fs.writeFileSync('tmp/db_output_11.json', JSON.stringify(data, null, 2));
  console.log('Results written to tmp/db_output_11.json');
}

checkApp11();
