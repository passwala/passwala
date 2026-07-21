const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: bookings, error } = await supabase
    .from('event_bookings')
    .select('id, qr_code_hash, status, invoice_number')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recent event bookings:', bookings);
}

main();
