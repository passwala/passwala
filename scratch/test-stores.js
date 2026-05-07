import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Fetching all stores ===");
  const { data, error } = await supabase
    .from('stores')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} stores:`);
  data.forEach((s, i) => {
    console.log(`Store ${i+1}: ID=${s.id}, Name=${s.name}, Address=${s.address}, Lat=${s.lat}, Lng=${s.lng}`);
  });
}

main();
