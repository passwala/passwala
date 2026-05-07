import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Querying database for user karanhdave2k20@gmail.com ===");
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'karanhdave2k20@gmail.com')
    .maybeSingle();

  if (error) {
    console.error("Error fetching user:", error);
    return;
  }

  console.log("Database User Record:", data);
}

main();
