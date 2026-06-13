// add_show_type_column.mjs - Migration to add show_type to events table
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const SQL = `
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS show_type VARCHAR(50) DEFAULT 'single' CHECK (show_type IN ('single', 'multiple', 'festival'));
`;

console.log('🔧 Adding show_type column to events table in Supabase...\n');

try {
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
