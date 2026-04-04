import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.replace(/"/g, '').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function debugDB() {
  const { data, error } = await supabase.from('vendor_applications').select('phone, business_name, status');
  if (error) {
    console.log('[ERROR]', error);
    return;
  }
  
  if (data.length === 0) {
    console.log('--- DB IS EMPTY ---');
    return;
  }
  
  console.log('--- VENDOR LIST ---');
  data.forEach((v, i) => {
    console.log(`[${i+1}] Phone: "${v.phone}" | Name: "${v.business_name}" | Status: ${v.status}`);
  });
}
debugDB();
