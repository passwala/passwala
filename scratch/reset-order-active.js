import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Resetting Order Status to ACCEPTED ===");
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'ACCEPTED',
      updated_at: new Date().toISOString()
    })
    .eq('id', '8c2e8b7e-a465-49db-885f-8760084c1232')
    .select();

  if (error) {
    console.error("Error resetting order:", error);
    return;
  }

  console.log("Successfully reset order in DB:", data);
}

main();
