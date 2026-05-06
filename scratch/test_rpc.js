import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function testRpc() {
  console.log("Testing SQL execution via RPC...");
  try {
    // Try standard execute_sql if it exists
    const { data, error } = await supabase.rpc('execute_sql', { 
      query: 'SELECT 1;' 
    });
    
    if (error) {
      console.log("RPC 'execute_sql' failed:", error.message);
    } else {
      console.log("RPC 'execute_sql' succeeded! Result:", data);
    }
  } catch (err) {
    console.error("Error running RPC:", err);
  }
}

testRpc();
