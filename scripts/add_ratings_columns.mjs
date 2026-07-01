import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const SQL = `
    ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS rating INT;
    ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS comment TEXT;
    
    ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS rating INT;
    ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS comment TEXT;
  `;

  console.log(`Running migration via exec_sql RPC...`);

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: SQL })
    }
  );

  if (response.ok) {
    const resData = await response.text();
    console.log('✅ Migration succeeded via exec_sql RPC!', resData);
  } else {
    const errText = await response.text();
    console.error('❌ RPC exec_sql failed:', errText);
  }
}

main();
