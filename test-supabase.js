import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfnurseswfdncneueckx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xYIhY-RkJZx9jObXcm0Tvg_OAVow43q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('vendors').select('*').limit(1);
  if (error) {
    console.error("FAIL:", error.message);
  } else {
    console.log("SUCCESS:", data);
  }
}

test();
