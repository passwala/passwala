import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableRLS() {
  const { data, error } = await supabase.rpc('disable_rls', { table_name: 'service_areas' });
  console.log("RPC Error:", error);
}

disableRLS();
