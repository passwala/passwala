import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableCols() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'city_routes' });
  if (error) {
    // try querying pg_attribute directly via REST if rpc doesn't exist
    const { data: d2, error: e2 } = await supabase.from('city_routes').select('*').limit(0);
    console.log('Error from rpc:', error.message);
    if (!e2 && d2) {
      console.log('Columns from select:', Object.keys(d2[0] || {}).length ? Object.keys(d2[0]) : 'no rows to infer from');
    }
  } else {
    console.log(data);
  }
}
checkTableCols();
