import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkPosts() {
  const { data, error } = await supabase.from('posts').select('*');
  console.log('Posts:', data);
  console.log('Error:', error);
}

checkPosts();
