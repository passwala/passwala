/* eslint-disable no-unused-vars */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApps() {
  const { data, error } = await supabase
    .from('vendor_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching vendor applications:', error);
    return;
  }

  console.log('--- Vendor Applications ---');
  console.log(JSON.stringify(data, null, 2));
}

checkApps();
