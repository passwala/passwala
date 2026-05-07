import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Setting All Orders to DELIVERED ===");
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'DELIVERED',
      updated_at: new Date().toISOString()
    })
    .neq('status', 'DELIVERED') // Update any order that is not already DELIVERED
    .select();

  if (error) {
    console.error("Error updating orders:", error);
    return;
  }

  console.log("Successfully marked orders as DELIVERED in DB:", data);
}

main();
