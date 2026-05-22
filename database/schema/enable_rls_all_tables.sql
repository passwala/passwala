-- ============================================================
-- PASSWALA DATABASE SECURITY MIGRATION
-- ENABLES ROW LEVEL SECURITY (RLS) & POLICIES ON ALL TABLES
-- ============================================================

-- Drop existing policies if any to prevent conflicts
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'users', 'wallet_transactions', 'addresses', 'service_categories', 
              'service_providers', 'services', 'service_bookings', 'vendors', 
              'stores', 'product_categories', 'products', 'inventory', 'carts', 
              'orders', 'order_items', 'riders', 'rider_locations', 'rider_earnings', 
              'posts', 'comments', 'notifications', 'deals', 'ai_recommendations', 
              'admins', 'reports', 'service_areas'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Enable Row Level Security (RLS) on all 26 tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1. USERS & WALLET
-- ============================================================

-- users
CREATE POLICY "Allow public read access to users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow users to insert their own profile" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id OR auth.uid()::text = uid);

CREATE POLICY "Allow users to delete their own profile" ON users
    FOR DELETE USING (auth.uid() = id OR auth.uid()::text = uid);

-- wallet_transactions
CREATE POLICY "Allow users to read their own wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Allow users to insert their own transactions" ON wallet_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Allow users to update/delete their own transactions" ON wallet_transactions
    FOR ALL USING (auth.uid() = user_id);

-- addresses
CREATE POLICY "Allow users to manage their own addresses" ON addresses
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- ============================================================
-- 2. SERVICES & BOOKINGS
-- ============================================================

-- service_categories
CREATE POLICY "Allow public read access to service_categories" ON service_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to write service_categories" ON service_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- service_providers
CREATE POLICY "Allow public read access to service_providers" ON service_providers
    FOR SELECT USING (true);

CREATE POLICY "Allow providers to manage their profile" ON service_providers
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- services
CREATE POLICY "Allow public read access to services" ON services
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- service_bookings
CREATE POLICY "Allow users and providers to manage service_bookings" ON service_bookings
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- ============================================================
-- 3. VENDORS & STORES
-- ============================================================

-- vendors
CREATE POLICY "Allow public read access to vendors" ON vendors
    FOR SELECT USING (true);

CREATE POLICY "Allow vendors to manage their profile" ON vendors
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- stores
CREATE POLICY "Allow public read access to stores" ON stores
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage stores" ON stores
    FOR ALL USING (auth.role() = 'authenticated');

-- product_categories
CREATE POLICY "Allow public read access to product_categories" ON product_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage product_categories" ON product_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- products
CREATE POLICY "Allow public read access to products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

-- inventory
CREATE POLICY "Allow public read access to inventory" ON inventory
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage inventory" ON inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 4. CARTS & ORDERS
-- ============================================================

-- carts
CREATE POLICY "Allow users to manage their own carts" ON carts
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- orders
CREATE POLICY "Allow users and stores to manage orders" ON orders
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- order_items
CREATE POLICY "Allow users and stores to manage order_items" ON order_items
    FOR ALL USING (true);

-- ============================================================
-- 5. RIDERS & EARNINGS
-- ============================================================

-- riders
CREATE POLICY "Allow public read access to riders" ON riders
    FOR SELECT USING (true);

CREATE POLICY "Allow riders to manage their profile" ON riders
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- rider_locations
CREATE POLICY "Allow public read access to rider_locations" ON rider_locations
    FOR SELECT USING (true);

CREATE POLICY "Allow riders to manage their locations" ON rider_locations
    FOR ALL USING (auth.role() = 'authenticated');

-- rider_earnings
CREATE POLICY "Allow riders to read their own earnings" ON rider_earnings
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. COMMUNITY (POSTS, COMMENTS)
-- ============================================================

-- posts
CREATE POLICY "Allow public read access to posts" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to write posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Allow users to update/delete their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- comments
CREATE POLICY "Allow public read access to comments" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to write comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Allow users to update/delete their own comments" ON comments
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- ============================================================
-- 7. SYSTEM & OTHER
-- ============================================================

-- notifications
CREATE POLICY "Allow users to manage their notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- deals
CREATE POLICY "Allow public read access to deals" ON deals
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage deals" ON deals
    FOR ALL USING (auth.role() = 'authenticated');

-- ai_recommendations
CREATE POLICY "Allow users to manage their recommendations" ON ai_recommendations
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- admins
CREATE POLICY "Allow authenticated to view admins" ON admins
    FOR ALL USING (auth.role() = 'authenticated');

-- reports
CREATE POLICY "Allow users to manage their reports" ON reports
    FOR ALL USING (auth.uid() = reporter_id OR auth.role() = 'authenticated');

-- service_areas
CREATE POLICY "Allow public read access to active service_areas" ON service_areas
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated to manage service_areas" ON service_areas
    FOR ALL USING (auth.role() = 'authenticated');
