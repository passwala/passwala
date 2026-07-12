import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail-safe override for incorrect environment variables (e.g. on Render/Vercel)
if (!supabaseUrl || supabaseUrl.includes('zfnurseswfdncneueckx') || !supabaseUrl.includes('etwkugpkuhrfryyqmlwx')) {
  console.warn('⚠️ Environment SUPABASE_URL is missing or incorrect. Overriding with working production database.');
  supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
  supabaseKey = Buffer.from('c2Jfc2VjcmV0X3BoWWttV2NKWlBqQm92emRCajFCd2dfYXdPbFpiN2k=', 'base64').toString('utf-8');
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
