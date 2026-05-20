const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const categories = [
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'Plumbing',
    icon_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '77777777-7777-7777-7777-111111111111',
    name: 'Electrical',
    icon_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '77777777-7777-7777-7777-222222222222',
    name: 'AC & Appliance',
    icon_url: 'https://images.unsplash.com/photo-1581578731522-aa02d681b94d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '77777777-7777-7777-7777-333333333333',
    name: 'Carpentry',
    icon_url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '77777777-7777-7777-7777-444444444444',
    name: 'Painting',
    icon_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '77777777-7777-7777-7777-555555555555',
    name: 'Cleaning',
    icon_url: 'https://images.unsplash.com/photo-1581578731158-a5a3c262c1db?auto=format&fit=crop&q=80&w=800'
  }
];

async function main() {
  console.log('Seeding service categories...');
  const { data, error } = await supabase.from('service_categories').upsert(categories, { onConflict: 'id' }).select();
  if (error) {
    console.error('Error seeding service categories:', error);
  } else {
    console.log('Successfully seeded:', data);
  }
}

main();
