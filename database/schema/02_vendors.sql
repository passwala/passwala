-- ================================================================
-- PASSWALA — VENDORS TABLE SETUP
-- ================================================================
-- This file creates all vendor-related tables:
-- vendors, service_providers, stores, products, product_categories,
-- inventory, deals, services, service_categories, service_bookings
--
-- ⚠️  Run AFTER 01_users_buyers.sql (vendors depend on users table)
-- Run in Supabase SQL Editor
-- ================================================================

-- ── Drop dependent tables first (reverse FK order) ───────────────
DROP TABLE IF EXISTS chat_messages     CASCADE;
DROP TABLE IF EXISTS chats             CASCADE;
DROP TABLE IF EXISTS chat_threads      CASCADE;
DROP TABLE IF EXISTS payments          CASCADE;
DROP TABLE IF EXISTS invoices          CASCADE;
DROP TABLE IF EXISTS order_items       CASCADE;
DROP TABLE IF EXISTS orders            CASCADE;
DROP TABLE IF EXISTS carts             CASCADE;
DROP TABLE IF EXISTS deals             CASCADE;
DROP TABLE IF EXISTS inventory         CASCADE;
DROP TABLE IF EXISTS products          CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS stores            CASCADE;
DROP TABLE IF EXISTS vendors           CASCADE;
DROP TABLE IF EXISTS service_bookings  CASCADE;
DROP TABLE IF EXISTS services          CASCADE;
DROP TABLE IF EXISTS service_providers CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;

-- ================================================================
-- TABLE: service_categories
-- Lookup table for service types (Plumbing, Electrical, etc.)
-- ================================================================
CREATE TABLE service_categories (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    icon_url   TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: service_providers
-- Expert/professional service vendor accounts
-- ================================================================
CREATE TABLE service_providers (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone             VARCHAR(20),                  -- 10-digit, no +91
    name              VARCHAR(255),                 -- Owner display name
    full_name         VARCHAR(255),                 -- Legal full name
    business_name     VARCHAR(255),                 -- Brand / service name
    about             TEXT,
    address           TEXT,
    license_no        VARCHAR(100),
    category          VARCHAR(100),                 -- e.g. Plumbing Services
    aadhar_no         VARCHAR(20),                  -- Encrypted / masked
    rating            DECIMAL(3,2)  DEFAULT 0.0,
    is_verified       BOOLEAN       DEFAULT FALSE,
    profile_completed BOOLEAN       DEFAULT FALSE,
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: services
-- Individual services offered by service_providers
-- ================================================================
CREATE TABLE services (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id      UUID         REFERENCES service_providers(id) ON DELETE CASCADE NOT NULL,
    category_id      UUID         REFERENCES service_categories(id) ON DELETE SET NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    image_url        TEXT,
    price            DECIMAL(10,2) NOT NULL,
    duration_minutes INT,
    is_active        BOOLEAN      DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: service_bookings
-- Customer bookings for services
-- ================================================================
CREATE TABLE service_bookings (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    service_id   UUID         REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    provider_id  UUID         REFERENCES service_providers(id) ON DELETE SET NULL,
    address_id   UUID         REFERENCES addresses(id) ON DELETE SET NULL,
    status       VARCHAR(50)  DEFAULT 'PENDING',
    -- status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(10,2),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: vendors
-- Retail shop / product vendor accounts
-- ================================================================
CREATE TABLE vendors (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone             VARCHAR(20)  UNIQUE NOT NULL,  -- 10-digit, no +91
    name              VARCHAR(255),                  -- Owner display name
    business_name     VARCHAR(255),                  -- Store / business name
    address           TEXT,
    license_no        VARCHAR(100),
    category          VARCHAR(100),                  -- e.g. Grocery & Essentials
    aadhar_no         VARCHAR(20),                   -- Encrypted / masked
    is_verified       BOOLEAN      DEFAULT FALSE,
    profile_completed BOOLEAN      DEFAULT FALSE,
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: stores
-- The public-facing store linked to a vendor
-- ================================================================
CREATE TABLE stores (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id   UUID         REFERENCES vendors(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url    TEXT,
    banner_url  TEXT,
    address     TEXT,
    lat         DECIMAL(10,8),
    lng         DECIMAL(11,8),
    is_open     BOOLEAN      DEFAULT TRUE,
    rating      DECIMAL(3,2) DEFAULT 0.0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: product_categories
-- Categories scoped to a specific store
-- ================================================================
CREATE TABLE product_categories (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id   UUID         REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (store_id, name)
);

-- ================================================================
-- TABLE: products
-- Products listed by a store
-- ================================================================
CREATE TABLE products (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id        UUID         REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    category_id     UUID         REFERENCES product_categories(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(10,2) NOT NULL,
    discount_price  DECIMAL(10,2),
    image_url       TEXT,
    barcode         TEXT,
    barcode_type    VARCHAR(50)  DEFAULT 'EAN-13',
    stock_quantity  INT          DEFAULT 0,
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: inventory
-- Stock tracking per product
-- ================================================================
CREATE TABLE inventory (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stock_count INT  DEFAULT 0,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: deals
-- Store-level promotional deals
-- ================================================================
CREATE TABLE deals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id            UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    title               VARCHAR(255) NOT NULL,
    discount_percentage INT,
    valid_until         TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES — Vendors & Related
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_vendors_phone          ON vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id        ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_user_id             ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_phone               ON service_providers(phone);
CREATE INDEX IF NOT EXISTS idx_stores_vendor_id       ON stores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id      ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id   ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_sb_user_id             ON service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_provider_id         ON service_bookings(provider_id);

-- ================================================================
-- TRIGGERS — Auto updated_at
-- ================================================================
DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_sp_updated_at ON service_providers;
CREATE TRIGGER trg_sp_updated_at
    BEFORE UPDATE ON service_providers
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE service_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals               ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_categories_all"  ON service_categories  FOR ALL USING (true);
CREATE POLICY "service_providers_all"   ON service_providers   FOR ALL USING (true);
CREATE POLICY "services_all"            ON services            FOR ALL USING (true);
CREATE POLICY "service_bookings_all"    ON service_bookings    FOR ALL USING (true);
CREATE POLICY "vendors_all"             ON vendors             FOR ALL USING (true);
CREATE POLICY "stores_all"              ON stores              FOR ALL USING (true);
CREATE POLICY "product_categories_all"  ON product_categories  FOR ALL USING (true);
CREATE POLICY "products_all"            ON products            FOR ALL USING (true);
CREATE POLICY "inventory_all"           ON inventory           FOR ALL USING (true);
CREATE POLICY "deals_all"               ON deals               FOR ALL USING (true);

-- ================================================================
-- SEED: Service Categories
-- ================================================================
INSERT INTO service_categories (name, icon_url) VALUES
    ('Appliance Repair',  'Wrench'),
    ('Home Cleaning',     'Sparkles'),
    ('Plumbing Services', 'Droplets'),
    ('Electrical Works',  'Bolt'),
    ('Salon at Home',     'Scissors'),
    ('Pest Control',      'Bug'),
    ('Home Painting',     'PaintBucket')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- TABLE: carts
-- ================================================================
CREATE TABLE carts (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    store_id     UUID         REFERENCES stores(id) ON DELETE SET NULL,
    items        JSONB        DEFAULT '[]'::jsonb,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: orders
-- ================================================================
CREATE TABLE orders (
    id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    store_id           UUID         REFERENCES stores(id) ON DELETE SET NULL,
    address_id         UUID         REFERENCES addresses(id) ON DELETE SET NULL,
    status             VARCHAR(50)  DEFAULT 'PLACED',
    subtotal           DECIMAL(10,2) NOT NULL,
    delivery_fee       DECIMAL(10,2) DEFAULT 0.00,
    total_amount       DECIMAL(10,2) NOT NULL,
    payment_status     VARCHAR(50)  DEFAULT 'PENDING',
    razorpay_order_id  TEXT,
    razorpay_payment_id TEXT,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: order_items
-- ================================================================
CREATE TABLE order_items (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id          UUID         REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id        UUID         REFERENCES products(id) ON DELETE SET NULL,
    quantity          INT          NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

ALTER TABLE carts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_all"       ON carts       FOR ALL USING (true);
CREATE POLICY "orders_all"      ON orders      FOR ALL USING (true);
CREATE POLICY "order_items_all" ON order_items FOR ALL USING (true);

-- ================================================================
-- TABLE: invoices
-- ================================================================
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

-- ================================================================
-- TABLE: payments
-- ================================================================
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

-- ================================================================
-- TABLE: chat_threads
-- ================================================================
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

-- ================================================================
-- TABLE: chats & chat_messages
-- ================================================================
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
    sender VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_all" ON invoices FOR ALL USING (true);
CREATE POLICY "payments_all" ON payments FOR ALL USING (true);
CREATE POLICY "chat_threads_all" ON chat_threads FOR ALL USING (true);
CREATE POLICY "chats_all" ON chats FOR ALL USING (true);
CREATE POLICY "chat_messages_all" ON chat_messages FOR ALL USING (true);
