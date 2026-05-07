import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Inspecting all columns of orders table ===");
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Keys on orders table object:", Object.keys(data[0]));
    console.log("Full first order row:", data[0]);
  } else {
    console.log("No orders found in database.");
  }
}

main();
