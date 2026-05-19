import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteVendor(targetId, businessName) {
  console.log(`Found vendor: ${businessName} with ID: ${targetId}. Starting deep delete...`);

  // 1. Find all order IDs for this vendor
  const { data: vendorOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('store_id', targetId);

  const orderIds = vendorOrders && vendorOrders.length > 0 
    ? vendorOrders.map(o => o.id) 
    : [];

  if (orderIds.length > 0) {
    console.log(`Deleting dependencies for ${orderIds.length} orders...`);
    // A. Delete rider earnings
    await supabase.from('rider_earnings').delete().in('order_id', orderIds);
    
    // B. Delete order items
    await supabase.from('order_items').delete().in('order_id', orderIds);
    
    // C. Delete orders
    await supabase.from('orders').delete().in('id', orderIds);
  }

  // 2. Delete cart items
  console.log('Clearing associated cart items...');
  await supabase.from('cart').delete().eq('store_id', targetId);

  // 3. Delete products and deals
  console.log('Clearing products and deals...');
  await supabase.from('products').delete().eq('store_id', targetId);
  await supabase.from('deals').delete().eq('store_id', targetId);

  // 4. Delete store
  console.log('Clearing store...');
  await supabase.from('stores').delete().eq('vendor_id', targetId);
  await supabase.from('stores').delete().eq('id', targetId);

  // 5. Delete vendor profile
  console.log('Deleting vendor profile...');
  const { error: vendorError } = await supabase.from('vendors').delete().eq('id', targetId);
  if (vendorError) {
    console.error('Failed to delete vendor row:', vendorError.message);
  } else {
    console.log('Vendor profile deleted successfully!');
  }
}

async function run() {
  console.log('Searching for vendor/store: dadadaaaad...');

  // Search by business_name in vendors
  const { data: vendors, error: vErr } = await supabase
    .from('vendors')
    .select('id, business_name')
    .ilike('business_name', 'dadadaaaad');

  if (vErr) {
    console.error('Error searching vendors:', vErr);
  }

  // Search by name in stores
  const { data: stores, error: sErr } = await supabase
    .from('stores')
    .select('id, vendor_id, name')
    .ilike('name', 'dadadaaaad');

  if (sErr) {
    console.error('Error searching stores:', sErr);
  }

  const vendorsToDelete = new Map();

  if (vendors && vendors.length > 0) {
    vendors.forEach(v => vendorsToDelete.set(v.id, v.business_name));
  }

  if (stores && stores.length > 0) {
    stores.forEach(s => {
      const vid = s.vendor_id || s.id;
      if (!vendorsToDelete.has(vid)) {
        vendorsToDelete.set(vid, s.name);
      }
    });
  }

  if (vendorsToDelete.size === 0) {
    console.log('No shops found with the name "dadadaaaad".');
    return;
  }

  console.log(`Found ${vendorsToDelete.size} matching vendor account(s).`);
  for (const [id, name] of vendorsToDelete.entries()) {
    await deleteVendor(id, name);
  }

  console.log('Deletion process completed!');
}

run();
