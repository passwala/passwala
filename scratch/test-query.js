import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const user = {
  uid: 'pUSbYJiePPQgUuMc2ZXSMxRLIQh1',
  email: 'karanhdave2k20@gmail.com',
  phoneNumber: 'np_pUSbYJiePPQgUuMc'
};

async function main() {
  console.log("=== Testing TrackOrders.jsx query ===");
  
  let resolvedUserId = user.id || user.uid;
  const isUUID = resolvedUserId && resolvedUserId.length === 36;
  
  if (!isUUID) {
    const phoneNo = user.phoneNumber?.replace('+91', '') || user.phone?.replace('+91', '');
    const orFilters = [];
    if (user.uid) orFilters.push(`uid.eq.${user.uid}`);
    if (user.email) orFilters.push(`email.eq.${user.email}`);
    if (phoneNo) {
      orFilters.push(`phone.eq.${phoneNo}`);
      orFilters.push(`phone.eq.+91${phoneNo}`);
    }
    
    if (orFilters.length > 0) {
      const { data: usr, error: usrErr } = await supabase
        .from('users')
        .select('id')
        .or(orFilters.join(','))
        .maybeSingle();
      if (usr) {
        resolvedUserId = usr.id;
        console.log("Resolved UUID successfully:", resolvedUserId);
      } else {
        console.log("Could not resolve user via filters.", usrErr);
        resolvedUserId = null;
      }
    } else {
      resolvedUserId = null;
    }
  }

  if (resolvedUserId && resolvedUserId.length === 36) {
    const { data: dbOrders, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        stores(name, address, lat, lng),
        addresses(*),
        order_items(
          id,
          quantity,
          price_at_purchase,
          products(name)
        )
      `)
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false });

    if (orderErr) {
      console.error("Error fetching orders:", orderErr);
    } else {
      console.log(`Successfully fetched ${dbOrders?.length || 0} orders:`, JSON.stringify(dbOrders, null, 2));
    }
  } else {
    console.log("No valid user UUID. Skipping query.");
  }
}

main();
