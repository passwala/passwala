import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('city_routes').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Success! Table exists. Data:", data);
  }
}
checkTable();
