import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('MISSING_ENV');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const check = async () => {
    try {
        const { data, error } = await supabase.from('community_posts').select('*').limit(1);
        if (error) {
            console.log('ERROR:', error.message);
        } else {
            console.log('COUNT:', data.length);
        }
    } catch (e) {
        console.log('CRASH:', e.message);
    }
};

check();
