import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Fetching all orders ===");
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      store_id,
      status,
      total_amount,
      created_at,
      stores (name)
    `);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} orders:`);
  data.forEach((o, i) => {
    console.log(`Order ${i+1}: ID=${o.id}, UserID=${o.user_id}, Status=${o.status}, Total=${o.total_amount}, Store=${o.stores?.name || 'none'}`);
  });
}

main();
