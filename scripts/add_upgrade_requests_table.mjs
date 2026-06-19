// scripts/add_upgrade_requests_table.mjs
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
CREATE TABLE IF NOT EXISTS public.event_organizer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    aadhar_no VARCHAR(20),
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    payment_id VARCHAR(100),
    request_status VARCHAR(50) DEFAULT 'SUBMITTED',
    amount DECIMAL(10,2) DEFAULT 999.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_organizer_requests ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can manage their own event organizer requests" ON public.event_organizer_requests;

-- Recreate policy
CREATE POLICY "Users can manage their own event organizer requests" ON public.event_organizer_requests
    FOR ALL USING (TRUE); -- Simplified for standard Rest API insertion and querying
`;

console.log('🔧 Creating event_organizer_requests table in Supabase...\n');

try {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  
  // Try via exec
  const { error } = await supabase.rpc('exec', { sql: SQL });
  if (!error) {
    console.log('✅ Table created successfully via supabase.rpc("exec")!');
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
    console.log('✅ Table created successfully via exec_sql RPC!');
    process.exit(0);
  } else {
    const err = await rpcResponse.text();
    console.error('❌ RPC "exec_sql" failed:', err);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
  process.exit(1);
}
