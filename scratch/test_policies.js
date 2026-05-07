import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPolicies() {
  const { data, error } = await supabase
    .from('pg_policies') // wait, pg_policies might not be exposed via Data API
    .select('*');
  
  if (error) {
    // try rpc
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_policies');
    console.log(rpcErr);
  } else {
    console.log(data);
  }
}

checkPolicies();
