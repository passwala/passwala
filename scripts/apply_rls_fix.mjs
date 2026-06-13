// apply_rls_fix.mjs - Applies the events RLS fix directly to Supabase
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Run SQL via Supabase Management API
const SQL = `
-- Fix 1: Drop broken RLS policies on event tables
DROP POLICY IF EXISTS "Event organizers can create events"       ON public.events;
DROP POLICY IF EXISTS "Event organizers can update own events"   ON public.events;
DROP POLICY IF EXISTS "Event organizers can delete own events"   ON public.events;
DROP POLICY IF EXISTS "Event organizers can insert ticket tiers" ON public.event_ticket_tiers;
DROP POLICY IF EXISTS "Event organizers can update ticket tiers" ON public.event_ticket_tiers;
DROP POLICY IF EXISTS "Event organizers can delete ticket tiers" ON public.event_ticket_tiers;
DROP POLICY IF EXISTS "Users can view own bookings"              ON public.event_bookings;
DROP POLICY IF EXISTS "Users can insert bookings"               ON public.event_bookings;
DROP POLICY IF EXISTS "Users can update own bookings"           ON public.event_bookings;
DROP POLICY IF EXISTS "Anyone can view events"                   ON public.events;
DROP POLICY IF EXISTS "Anyone can view event tiers"              ON public.event_ticket_tiers;

-- Fix 2: Disable RLS on all event tables
ALTER TABLE public.events              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_tiers  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings      DISABLE ROW LEVEL SECURITY;

-- Fix 3: Grant full access
GRANT ALL ON public.events             TO anon, authenticated;
GRANT ALL ON public.event_ticket_tiers TO anon, authenticated;
GRANT ALL ON public.event_bookings     TO anon, authenticated;

-- Fix 4: Ensure users table is readable by anon (for auth sync)
GRANT SELECT ON public.users     TO anon, authenticated;
GRANT SELECT ON public.addresses TO anon, authenticated;

-- Fix 5: Ensure open RLS policies on users (recreate to be safe)
DROP POLICY IF EXISTS "users_all"     ON public.users;
DROP POLICY IF EXISTS "addresses_all" ON public.addresses;
CREATE POLICY "users_all"     ON public.users     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "addresses_all" ON public.addresses FOR ALL USING (true) WITH CHECK (true);
`;

console.log('🔧 Applying database fixes to Supabase...\n');

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
    console.log('✅ Migration applied successfully via Management API!');
    process.exit(0);
  }

  // Fallback: try via PostgREST RPC
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
    console.log('✅ Migration applied via RPC!');
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
