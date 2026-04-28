/* eslint-disable no-unused-vars */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkDuplicates() {
  const { data, error } = await supabase.from('vendor_applications').select('phone');
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  const counts = {};
  data.forEach(v => {
    counts[v.phone] = (counts[v.phone] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([phone, c]) => c > 1);
  console.log('--- DB DUPLICATE CHECK ---');
  if (duplicates.length === 0) {
    console.log('✅ No duplicate phone numbers found! Each number exists only once.');
  } else {
    duplicates.forEach(([p, c]) => {
      console.log(`❌ Duplicate found: ${p} (appears ${c} times)`);
    });
  }
}

checkDuplicates();
