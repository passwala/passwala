import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Fetching all addresses ===");
  const { data, error } = await supabase
    .from('addresses')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} addresses:`);
  data.forEach((ad, i) => {
    console.log(`Address ${i+1}: ID=${ad.id}, Line1=${ad.address_line_1}, Lat=${ad.lat}, Lng=${ad.lng}`);
  });
}

main();
