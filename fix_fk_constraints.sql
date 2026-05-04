-- Run this directly in the Supabase SQL Editor to fix Foreign Key Constraints
-- This will add "ON DELETE CASCADE" to the necessary relations so that 
-- when you delete a Vendor or Store, it cleanly removes all associated data instead of failing.

-- Fix orders -> stores
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_store_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- Fix cart -> stores
ALTER TABLE public.cart DROP CONSTRAINT IF EXISTS cart_store_id_fkey;
ALTER TABLE public.cart ADD CONSTRAINT cart_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- Fix order_items -> products
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Fix service_bookings -> service_providers
ALTER TABLE public.service_bookings DROP CONSTRAINT IF EXISTS service_bookings_provider_id_fkey;
ALTER TABLE public.service_bookings ADD CONSTRAINT service_bookings_provider_id_fkey 
  FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE;

-- Automatically reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
