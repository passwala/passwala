import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fail-safe override for incorrect environment variables (e.g. on Vercel)
if (!supabaseUrl || supabaseUrl.includes('zfnurseswfdncneueckx') || !supabaseUrl.includes('etwkugpkuhrfryyqmlwx')) {
  console.warn('⚠️ Client-side Supabase URL is missing or incorrect. Overriding with working production database.');
  supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);
