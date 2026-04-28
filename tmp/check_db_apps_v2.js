 
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApps() {
  const { data, error } = await supabase.from('vendor_applications').select('*');
  if (error) {
    fs.writeFileSync('tmp/db_apps.json', JSON.stringify({ error: error.message }));
    return;
  }
  fs.writeFileSync('tmp/db_apps.json', JSON.stringify(data, null, 2));
}

checkApps();
