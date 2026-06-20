// add_is_admin_organized.mjs - Migration to add is_admin_organized to events table
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

if (!SUPABASE_URL || !SERVICE_KEY || !PROJECT_REF) {
  console.error('❌ Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or PROJECT_REF');
  process.exit(1);
}

const SQL = `
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS is_admin_organized BOOLEAN DEFAULT FALSE;
`;

console.log('🔧 Adding is_admin_organized column to events table in Supabase...\n');

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
    console.log('✅ Column added successfully via Management API!');
    process.exit(0);
  } else {
    const errText = await response.text();
    console.warn('⚠️ Management API failed:', errText);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  
  // Try via supabase.rpc('exec') first
  const { error } = await supabase.rpc('exec', { sql: SQL });
  if (!error) {
    console.log('✅ Column added successfully via supabase.rpc("exec")!');
    process.exit(0);
  }
  
  console.warn('⚠️  RPC "exec" failed:', error.message);
  
  // Fallback to PostgREST RPC exec_sql
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
    console.log('✅ Column added successfully via exec_sql RPC!');
    process.exit(0);
  } else {
    const err = await rpcResponse.text();
    console.warn('❌ RPC "exec_sql" failed:', err);
    console.log('\nPlease run the following SQL manually in Supabase SQL Editor:');
    console.log(SQL);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
  process.exit(1);
}
