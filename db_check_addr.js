import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: order } = await supabase.from('orders').select('id, address_id, status').order('created_at', { ascending: false }).limit(1);
  if (order && order.length > 0) {
    console.log("Order:", order[0]);
    if (order[0].address_id) {
       const { data: addr } = await supabase.from('addresses').select('*').eq('id', order[0].address_id);
       console.log("Address:", addr);
    }
  }
}
check();
