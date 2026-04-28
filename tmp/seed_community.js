 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding Community Posts...');
  
  // 1. Create Table (SQL via RPC if available, or just assume it exists if I can)
  // Since I can't run arbitrary SQL easily without a helper, I'll just try to insert.
  // Wait, I should probably check if the table exists.
  
  const posts = [
    {
      content: 'I just got my AC fixed by Vikas Tech and the experience was amazing. Transparent pricing and local trust! Highly recommend for anyone in Ahmedabad.',
      likes_count: 12
    },
    {
      content: 'The milk delivery from Local Fresh is consistently early. Best quality in the neighborhood so far! 🥛',
      likes_count: 45
    },
    {
      content: 'WoodWorks turned my old table into a masterpiece. Authentic carpentry still exists in Ahmedabad! 🪚',
      likes_count: 89
    }
  ];

  const { error } = await supabase.from('posts').upsert(posts, { onConflict: 'content' });
  if (error) {
    console.error('Error seeding:', error);
  } else {
    console.log('Successfully seeded community data! ✅');
  }
}

seed();
