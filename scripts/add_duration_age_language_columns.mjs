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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SQL = `
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
    ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(100),
    ADD COLUMN IF NOT EXISTS language VARCHAR(100);

NOTIFY pgrst, 'reload schema';
`;

console.log('🔧 Executing migration SQL to add events columns...\n');

// Try exec RPC
try {
  console.log('Trying rpc("exec")...');
  const { data, error } = await supabase.rpc('exec', { sql: SQL });
  if (!error) {
    console.log('✅ Migration succeeded via rpc("exec")!');
    process.exit(0);
  } else {
    console.error('⚠️ rpc("exec") failed:', error.message);
  }
} catch (e) {
  console.error('⚠️ rpc("exec") threw error:', e.message);
}

// Try exec_sql RPC
try {
  console.log('Trying rpc("exec_sql")...');
  const { data, error } = await supabase.rpc('exec_sql', { sql: SQL });
  if (!error) {
    console.log('✅ Migration succeeded via rpc("exec_sql")!');
    process.exit(0);
  } else {
    console.error('⚠️ rpc("exec_sql") failed:', error.message);
  }
} catch (e) {
  console.error('⚠️ rpc("exec_sql") threw error:', e.message);
}

// Try query RPC
try {
  console.log('Trying rpc("query")...');
  const { data, error } = await supabase.rpc('query', { query: SQL });
  if (!error) {
    console.log('✅ Migration succeeded via rpc("query")!');
    process.exit(0);
  } else {
    console.error('⚠️ rpc("query") failed:', error.message);
  }
} catch (e) {
  console.error('⚠️ rpc("query") threw error:', e.message);
}

console.log('\n❌ All automatic RPC routes failed. Please make sure the SQL editor is used or create an exec function.');
process.exit(1);
