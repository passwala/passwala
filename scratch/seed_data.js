
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Create a Buyer
    const { data: buyer, error: buyerError } = await supabase.from('users').upsert([
      { 
        id: '00000000-0000-0000-0000-000000000001', 
        phone: '9999999999', 
        full_name: 'John Doe', 
        role: 'BUYER',
        created_at: new Date().toISOString()
      }
    ]).select().single();
    if (buyerError) console.error('Buyer Error:', buyerError.message);
    else console.log('✅ Buyer created:', buyer.full_name);

    // 2. Create a Vendor User & Vendor Profile
    const vendorUserId = '00000000-0000-0000-0000-000000000002';
    await supabase.from('users').upsert([
      { id: vendorUserId, phone: '8888888888', full_name: 'Anita Bakery Owner', role: 'VENDOR' }
    ]);
    
    const { data: vendor, error: vendorError } = await supabase.from('vendors').upsert([
      { 
        id: 'v-001',
        user_id: vendorUserId, 
        business_name: 'Anita Bakers', 
        category: 'Bakery', 
        address: 'Downtown Street 10',
        phone: '8888888888',
        is_verified: true,
        profile_completed: true
      }
    ]).select().single();
    if (vendorError) console.error('Vendor Error:', vendorError.message);
    else console.log('✅ Vendor created:', vendor.business_name);

    // 3. Create a Rider User & Rider Profile
    const riderUserId = '00000000-0000-0000-0000-000000000003';
    await supabase.from('users').upsert([
      { id: riderUserId, phone: '7777777777', full_name: 'Flash Delivery Guy', role: 'RIDER' }
    ]);

    const { data: rider, error: riderError } = await supabase.from('riders').upsert([
      { 
        id: 'r-001',
        user_id: riderUserId, 
        vehicle_no: 'GJ-01-BK-9999', 
        phone: '7777777777',
        full_name: 'Flash Delivery Guy',
        is_verified: true,
        is_active: true
      }
    ]).select().single();
    if (riderError) console.error('Rider Error:', riderError.message);
    else console.log('✅ Rider created:', rider.full_name);

    // 4. Create a Product
    const { data: product, error: productError } = await supabase.from('products').upsert([
      {
        id: 'p-001',
        store_id: 'v-001',
        name: 'Whole Wheat Bread',
        description: 'Freshly baked every morning',
        price: 45,
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
        is_active: true
      }
    ]).select().single();
    if (productError) console.error('Product Error:', productError.message);
    else console.log('✅ Product created:', product.name);

    console.log('✨ Seeding complete!');
  } catch (err) {
    console.error('Unexpected seeding error:', err);
  }
}

seed();
