const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*, event_ticket_tiers(*)')
      .neq('status', 'PENDING_APPROVAL')
      .neq('status', 'REJECTED')
      .or('visibility.is.null,visibility.eq.public');
    
    if (error) {
      console.error('Supabase Query Error:', error);
      return;
    }
    
    console.log('Query successful, fetched events:', events.length);
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();
