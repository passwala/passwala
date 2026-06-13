// run_migration.mjs - Run the events RLS fix migration
// Usage: node scripts/run_migration.mjs

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const sql = readFileSync(join(__dirname, '..', 'database', 'migrations', 'fix_events_rls_policies.sql'), 'utf-8');

// Split the SQL into individual statements and run each
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n🚀 Running ${statements.length} SQL statements...\n`);

let passed = 0;
let failed = 0;

for (const stmt of statements) {
  const preview = stmt.split('\n')[0].substring(0, 60);
  try {
    const { error } = await supabase.rpc('exec', { sql: stmt + ';' }).single();
    if (error) {
      // Try direct query via REST
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: stmt + ';' })
      });
      if (!resp.ok) {
        console.warn(`  ⚠️  ${preview}... → skipped (${error.message})`);
        failed++;
      } else {
        console.log(`  ✅  ${preview}...`);
        passed++;
      }
    } else {
      console.log(`  ✅  ${preview}...`);
      passed++;
    }
  } catch (e) {
    console.warn(`  ⚠️  ${preview}... → ${e.message}`);
    failed++;
  }
}

console.log(`\n✅ Done: ${passed} succeeded, ${failed} warnings\n`);
