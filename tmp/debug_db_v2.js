const { createClient } = require('@supabase/supabase-js')
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function debugDB() {
  const { data, error } = await supabase.from('vendor_applications').select('phone, business_name, status');
  if (error) {
    console.log('--- ERROR ---', error);
  } else {
    console.log('--- DB ROWS ---');
    console.table(data);
  }
}
debugDB();
