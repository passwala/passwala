import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tablesToTruncate = [
  'services',
  'essentials',
  'deals',
  'recommendations',
  'community_posts',
  'bookings',
  'vendor_applications'
];

async function removeFakeData() {
  console.log("🚀 Starting cleanup of fake neighborhood data...");

  for (const table of tablesToTruncate) {
    try {
      console.log(`🗑️  Truncating ${table}...`);
      // Since Supabase doesn't have a direct 'TRUNCATE' via JS, we delete everything
      // Using a 'neq' filter on 'id' is a common way to catch all rows
      const { error } = await supabase
        .from(table)
        .delete()
        .or('id.gt.0,id.lt.0'); // Delete everything in tables with BIGINT id
      
      if (error) {
        // Some tables might have UUID ids (like bookings)
        const { error: uuidError } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (uuidError) throw uuidError;
      }
      
      console.log(`✅  ${table} cleared.`);
    } catch (err) {
      console.error(`❌  Failed to clear ${table}:`, err.message);
    }
  }

  console.log("\n✨ Cleanup finished. The neighborhood is now a blank canvas.");
}

removeFakeData();
