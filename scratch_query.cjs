const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('sports_venues')
    .select('*')
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching bookings:', error);
  } else {
    console.log('Bookings:', JSON.stringify(data, null, 2));
  }
}

main();
