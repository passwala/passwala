import 'dotenv/config';
console.log("URL:", process.env.VITE_SUPABASE_URL);
console.log("SERVICE_KEY:", process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? "EXISTS" : "MISSING");
console.log("ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "EXISTS" : "MISSING");
