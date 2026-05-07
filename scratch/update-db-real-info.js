import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwkugpkuhrfryyqmlwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2t1Z3BrdWhyZnJ5eXFtbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzU0MTEsImV4cCI6MjA5MTQxMTQxMX0.wSUiHr0QSQiFqgGiPgxoIJ2dnRN_zvKTkttlHf94BDE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== Updating database with realistic names and coordinates ===");

  // 1. Update Store ID '77d220aa-9c35-44a3-9c78-ff2f4cae93f6' (formerly 'nnhn')
  const { error: storeError } = await supabase
    .from('stores')
    .update({
      name: 'Passwala Supermarket Hub',
      address: 'Paldi Crossing, Ahmedabad, Gujarat',
      lat: 23.013500,
      lng: 72.562400
    })
    .eq('id', '77d220aa-9c35-44a3-9c78-ff2f4cae93f6');

  if (storeError) {
    console.error("Error updating store:", storeError);
  } else {
    console.log("Successfully updated Store to: Passwala Supermarket Hub");
  }

  // 2. Update Address ID '431fa3d6-0764-4faa-a80a-2a1edcd84f18'
  const { error: addrError } = await supabase
    .from('addresses')
    .update({
      address_line_1: 'Premium Residences, Paldi, Ahmedabad',
      lat: 23.029400,
      lng: 72.574500
    })
    .eq('id', '431fa3d6-0764-4faa-a80a-2a1edcd84f18');

  if (addrError) {
    console.error("Error updating address:", addrError);
  } else {
    console.log("Successfully updated Address coordinates & address line 1");
  }

  // 3. Update Address ID '9013e5b3-f7e3-4132-b84c-9e59c6d22657'
  const { error: addrError2 } = await supabase
    .from('addresses')
    .update({
      address_line_1: 'Cozy Apartments, Satellite, Ahmedabad',
      lat: 23.031500,
      lng: 72.525500
    })
    .eq('id', '9013e5b3-f7e3-4132-b84c-9e59c6d22657');

  if (addrError2) {
    console.error("Error updating second address:", addrError2);
  } else {
    console.log("Successfully updated second Address coordinates");
  }
}

main();
