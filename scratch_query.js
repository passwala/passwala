const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('venue_bookings')
    .select('*, sports_venues(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching bookings:', error);
  } else {
    console.log('Bookings:', JSON.stringify(data, null, 2));
  }
}

main();
