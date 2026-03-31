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
      user_name: 'Jane Doe',
      user_avatar: 'JD',
      location: 'Satellite Resident',
      text: 'I just got my AC fixed by Vikas Tech and the experience was amazing. Transparent pricing and local trust! Highly recommend for anyone in Ahmedabad.',
      likes: 12,
      comments: 3
    },
    {
      user_name: 'Priya K.',
      user_avatar: 'PK',
      location: 'Vastrapur Resident',
      text: 'The milk delivery from Local Fresh is consistently early. Best quality in the neighborhood so far! 🥛',
      likes: 45,
      comments: 8
    },
    {
      user_name: 'Rohan Shah',
      user_avatar: 'RS',
      location: 'Ambawadi Resident',
      text: 'WoodWorks turned my old table into a masterpiece. Authentic carpentry still exists in Ahmedabad! 🪚',
      likes: 89,
      comments: 15
    }
  ];

  const { error } = await supabase.from('community_posts').upsert(posts, { onConflict: 'text' });
  if (error) {
    console.error('Error seeding:', error);
  } else {
    console.log('Successfully seeded community data! ✅');
  }
}

seed();
