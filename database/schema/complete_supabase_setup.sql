-- ==============================================================
-- PASSWALA COMPLETE SUPABASE DATABASE SETUP SCRIPT
-- ==============================================================
-- A unified, production-grade SQL script containing all tables, 
-- constraints, foreign keys, optimized indexes, Row Level Security (RLS) 
-- policies, Supabase Realtime setup, and seed data.
-- ==============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order to prevent conflicts
DROP TABLE IF EXISTS delivery_tracking CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS chat_threads CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS rider_earnings CASCADE;
DROP TABLE IF EXISTS rider_locations CASCADE;
DROP TABLE IF EXISTS riders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS service_bookings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_providers CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS service_areas CASCADE;

-- ==============================================================
-- 1. CORE USER SCHEMAS
-- ==============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(255),
    photo_url TEXT,
    role VARCHAR(50) DEFAULT 'BUYER', -- 'BUYER', 'VENDOR', 'RIDER', 'ADMIN'
    uid VARCHAR(255) UNIQUE,
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    fcm_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) DEFAULT 'CREDIT', -- CREDIT or DEBIT
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 2. SERVICES & BOOKINGS
-- ==============================================================

CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    about TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
    address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 3. VENDORS, STORES & INVENTORY
-- ==============================================================

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    address TEXT,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    is_open BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (store_id, name)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    image_url TEXT,
    barcode TEXT,
    barcode_type VARCHAR(50) DEFAULT 'EAN-13',
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stock_count INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 4. CARTS, ORDERS & CHECKOUT
-- ==============================================================

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PLACED', -- 'PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'FAILED'
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 5. RIDERS, EARNINGS & TRACKING
-- ==============================================================

CREATE TABLE riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    vehicle_no VARCHAR(50) NOT NULL,
    license_no VARCHAR(100) NOT NULL,
    id_proof VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_deliveries INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rider_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES riders(id) ON DELETE CASCADE UNIQUE NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    status VARCHAR(50) DEFAULT 'OFFLINE', -- 'ONLINE', 'OFFLINE', 'BUSY'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rider_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES riders(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payout_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 6. COMMUNITY & ENGAGEMENT
-- ==============================================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 7. SYSTEM & ENGAGEMENT
-- ==============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    discount_percentage INT,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    recommendation_type VARCHAR(100),
    item_id UUID,
    score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 8. SYSTEM ADMIN & REPORTS
-- ==============================================================

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'SUPERADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(100),
    target_id UUID,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED', 'DISMISSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(100) DEFAULT 'Ahmedabad',
    area_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 9. REAL-TIME MULTI-APP DISPATCH & MESSAGING
-- ==============================================================

CREATE TABLE chat_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2),
    provider_id UUID,
    last_message TEXT,
    timestamp VARCHAR(50),
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2),
    provider_id UUID,
    last_message TEXT,
    timestamp VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'user' or 'vendor'
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 10. PLANET SOFTWEB UTILITIES
-- ==============================================================

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage INT NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    max_discount DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    seller_state VARCHAR(100) DEFAULT 'Gujarat',
    customer_state VARCHAR(100) NOT NULL,
    cgst DECIMAL(10,2) DEFAULT 0.00,
    sgst DECIMAL(10,2) DEFAULT 0.00,
    igst DECIMAL(10,2) DEFAULT 0.00,
    delivery_charges DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_tax DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    invoice_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'Razorpay',
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    amount DECIMAL(10,2) NOT NULL,
    refund_status VARCHAR(50) DEFAULT 'NONE',
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    raw_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE delivery_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'
    tracking_steps JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 11. INDEX OPTIMIZATIONS
-- ==============================================================

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_user_id ON service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_provider_id ON service_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_stores_vendor_id ON stores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON delivery_tracking(order_id);

-- ==============================================================
-- 12. TRIGGERS & FUNCTIONS
-- ==============================================================

-- Automated updated_at refresh for users
CREATE OR REPLACE FUNCTION refresh_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION refresh_updated_at_timestamp();

-- Automated updated_at refresh for delivery tracking
CREATE OR REPLACE FUNCTION update_delivery_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_delivery_tracking_updated_at
    BEFORE UPDATE ON delivery_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_tracking_updated_at();

-- ==============================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================

-- Enable RLS across all tables
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
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update their own profile" ON users FOR UPDATE USING (auth.uid() = id OR auth.uid()::text = uid);
CREATE POLICY "Allow users to delete their own profile" ON users FOR DELETE USING (auth.uid() = id OR auth.uid()::text = uid);

-- 2. Wallets policies
CREATE POLICY "Allow users to read their own wallet transactions" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow users to insert their own transactions" ON wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow users to update/delete their own transactions" ON wallet_transactions FOR ALL USING (auth.uid() = user_id);

-- 3. Addresses policies
CREATE POLICY "Allow users to manage their own addresses" ON addresses FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- 4. Services policies
CREATE POLICY "Allow public read access to service_categories" ON service_categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to write service_categories" ON service_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to service_providers" ON service_providers FOR SELECT USING (true);
CREATE POLICY "Allow providers to manage their profile" ON service_providers FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to services" ON services FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage services" ON services FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users and providers to manage service_bookings" ON service_bookings FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- 5. Vendors & Stores policies
CREATE POLICY "Allow public read access to vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Allow vendors to manage their profile" ON vendors FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage stores" ON stores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to product_categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage product_categories" ON product_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage inventory" ON inventory FOR ALL USING (auth.role() = 'authenticated');

-- 6. Carts & Orders policies
CREATE POLICY "Allow users to manage their own carts" ON carts FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow users and stores to manage orders" ON orders FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow users and stores to manage order_items" ON order_items FOR ALL USING (true);

-- 7. Riders policies
CREATE POLICY "Allow public read access to riders" ON riders FOR SELECT USING (true);
CREATE POLICY "Allow riders to manage their profile" ON riders FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to rider_locations" ON rider_locations FOR SELECT USING (true);
CREATE POLICY "Allow riders to manage their locations" ON rider_locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow riders to read their own earnings" ON rider_earnings FOR ALL USING (auth.role() = 'authenticated');

-- 8. Community policies
CREATE POLICY "Allow public read access to posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to write posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow users to update/delete their own posts" ON posts FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to write comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow users to update/delete their own comments" ON comments FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- 9. System & Other policies
CREATE POLICY "Allow users to manage their notifications" ON notifications FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to deals" ON deals FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage deals" ON deals FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users to manage their recommendations" ON ai_recommendations FOR ALL USING (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to view admins" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users to manage their reports" ON reports FOR ALL USING (auth.uid() = reporter_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to active service_areas" ON service_areas FOR SELECT USING (is_active = true);
CREATE POLICY "Allow authenticated to manage service_areas" ON service_areas FOR ALL USING (auth.role() = 'authenticated');

-- 10. Relational Chats policies
CREATE POLICY "Allow users to CRUD their own chat threads" ON chat_threads FOR ALL USING (auth.uid() = user_id OR (user_id IS NOT NULL AND auth.role() = 'authenticated'));
CREATE POLICY "Allow users to CRUD their own chats" ON chats FOR ALL USING (auth.uid() = user_id OR (user_id IS NOT NULL AND auth.role() = 'authenticated'));
CREATE POLICY "Allow users to CRUD chat messages" ON chat_messages FOR ALL USING (chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid() OR auth.role() = 'authenticated'));

-- 11. Planet Softweb policies
CREATE POLICY "Allow public select on coupons" ON coupons FOR SELECT USING (true);
CREATE POLICY "Allow public all on coupons" ON coupons FOR ALL USING (true);
CREATE POLICY "Allow public all on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow public all on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow public all on delivery_tracking" ON delivery_tracking FOR ALL USING (true);

-- ==============================================================
-- 14. REAL-TIME REPLICATION CONFIGURATION
-- ==============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER publication supabase_realtime ADD TABLE chats;
        ALTER publication supabase_realtime ADD TABLE chat_messages;
        ALTER publication supabase_realtime ADD TABLE chat_threads;
        ALTER publication supabase_realtime ADD TABLE delivery_tracking;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not automatically configure supabase_realtime publication';
END $$;

-- ==============================================================
-- 15. DEMO SEED DATA
-- ==============================================================

-- Seed service areas
INSERT INTO service_areas (area_name, is_active) VALUES 
('Satellite', true),
('Bopal', true),
('Prahlad Nagar', true),
('Sindhu Bhavan', true),
('Gota', false),
('Science City', false)
ON CONFLICT (area_name) DO NOTHING;

-- Seed default coupons
INSERT INTO coupons (code, discount_percentage, max_discount, min_order_amount) VALUES 
('SOFTWEB20', 20, 500.00, 200.00),
('GSTFREE', 10, 200.00, 100.00)
ON CONFLICT (code) DO NOTHING;

-- Seed service categories
INSERT INTO service_categories (name, icon_url) VALUES 
('Appliance Repair', 'Wrench'),
('Home Cleaning', 'Sparkles'),
('Plumbing Services', 'Droplets'),
('Electrical Works', 'Bolt'),
('Salon at Home', 'Scissors')
ON CONFLICT (name) DO NOTHING;
