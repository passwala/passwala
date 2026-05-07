import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Querying database for recent orders ===");
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      status,
      total_amount,
      created_at,
      stores (name),
      users (id, full_name, email, phone)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  console.log(`Found ${data?.length || 0} recent orders:`);
  data.forEach((o, i) => {
    console.log(`\n[Order #${i + 1}] ID: ${o.id} (Short: ${o.id.substring(0, 6).toUpperCase()})`);
    console.log(`  User ID in Order: ${o.user_id}`);
    console.log(`  User Details:`, o.users);
    console.log(`  Store Name:`, o.stores?.name);
    console.log(`  Status: ${o.status}`);
    console.log(`  Amount: ₹${o.total_amount}`);
    console.log(`  Created At: ${o.created_at}`);
  });
}

main();
