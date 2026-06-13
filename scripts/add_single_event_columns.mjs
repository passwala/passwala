// add_single_event_columns.mjs - Migration to add visibility, is_online, and ends_at to events table
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!PROJECT_REF || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const SQL = `
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;
`;

console.log('🔧 Adding visibility, is_online, and ends_at columns to events table in Supabase...\n');

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: SQL })
    }
  );

  if (response.ok) {
    console.log('✅ Columns added successfully via Management API!');
    process.exit(0);
  }

  // Fallback: try via PostgREST RPC exec_sql
  console.log('Management API not available, trying PostgREST RPC...');
  const rpcResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: SQL })
    }
  );

  if (rpcResponse.ok) {
    console.log('✅ Columns added successfully via exec_sql RPC!');
    process.exit(0);
  } else {
    const err = await rpcResponse.text();
    console.log('\n⚠️  Automatic migration failed. Run manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('\n--- Paste this SQL ---\n');
    console.log(SQL);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Error:', e.message);
  console.log('\n⚠️  Run the SQL manually in Supabase SQL Editor.');
  process.exit(1);
}
