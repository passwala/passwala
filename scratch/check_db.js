import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDb() {
  console.log("Checking Supabase tables...");

  const tables = ['users', 'vendors', 'service_providers', 'stores', 'services', 'products'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`--- Table: ${table}, Count: ${data.length} ---`);
      if (data.length > 0) {
        console.log("Keys of first record:", Object.keys(data[0]));
        console.log("First record:", JSON.stringify(data[0], null, 2));
      }
    }
  }
}

checkDb();
