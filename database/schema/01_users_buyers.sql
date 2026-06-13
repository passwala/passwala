-- ================================================================
-- PASSWALA — 01: USERS & BUYER SIDE
-- ================================================================
-- Tables:
--   users              → All platform users (role-based)
--   buyers_view        → View: only buyer accounts
--   addresses          → Delivery addresses
--   wallet_transactions→ Wallet credit/debit history
--   notifications      → In-app push notifications
--   service_areas      → Ahmedabad area list
--   carts              → Buyer shopping cart
--   orders             → Placed orders
--   order_items        → Line items in each order
--   invoices           → GST invoices per order
--   payments           → Razorpay payment records
--   chat_threads       → Buyer ↔ Vendor chat threads
--   chats              → Chat sessions
--   chat_messages      → Individual messages
--
-- ⚠️  Run this FIRST before all other schema files.
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- SHARED TRIGGER FUNCTION
-- Auto-update updated_at on any table that needs it
-- ================================================================
CREATE OR REPLACE FUNCTION refresh_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- TABLE: users
-- Stores ALL platform users. role field differentiates them.
-- role: 'BUYER' | 'VENDOR' | 'SERVICE_PROVIDER' | 'RIDER' | 'ADMIN'
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone          VARCHAR(20)   UNIQUE NOT NULL,      -- Login identifier (10-digit)
    full_name      VARCHAR(100),
    email          VARCHAR(255),
    photo_url      TEXT,
    role           VARCHAR(50)   NOT NULL DEFAULT 'BUYER',
    uid            VARCHAR(255)  UNIQUE,               -- WhatsApp OTP / Firebase UID
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    fcm_token      TEXT,                               -- Push notification token
    is_suspended   BOOLEAN       DEFAULT FALSE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_uid   ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ================================================================
-- VIEW: buyers_view
-- Shows only buyer accounts — used by admin panel & reports
-- ================================================================
CREATE OR REPLACE VIEW buyers_view
WITH (security_invoker = true) AS
    SELECT id, phone, full_name, email, photo_url, uid,
           wallet_balance, fcm_token, created_at, updated_at
    FROM users WHERE role = 'BUYER';


-- ================================================================
-- TABLE: service_areas
-- Ahmedabad delivery zones shown in buyer address picker
-- ================================================================
CREATE TABLE IF NOT EXISTS service_areas (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    city       VARCHAR(100) DEFAULT 'Ahmedabad',
    area_name  VARCHAR(100) UNIQUE NOT NULL,
    is_active  BOOLEAN      DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO service_areas (area_name, is_active) VALUES
    ('Satellite',       TRUE),
    ('Bopal',           TRUE),
    ('Prahlad Nagar',   TRUE),
    ('Sindhu Bhavan',   TRUE),
    ('Navrangpura',     TRUE),
    ('Thaltej',         TRUE),
    ('SG Highway',      TRUE),
    ('Gota',            FALSE),
    ('Science City',    FALSE)
ON CONFLICT (area_name) DO NOTHING;


-- ================================================================
-- TABLE: addresses
-- Saved delivery addresses for a buyer
-- ================================================================
CREATE TABLE IF NOT EXISTS addresses (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    address_line_1 TEXT         NOT NULL,
    address_line_2 TEXT,
    city           VARCHAR(100),
    state          VARCHAR(100),
    pincode        VARCHAR(10),
    lat            DECIMAL(10,8),
    lng            DECIMAL(11,8),
    is_default     BOOLEAN      DEFAULT FALSE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);


-- ================================================================
-- TABLE: wallet_transactions
-- Buyer wallet credit/debit history
-- type: 'CREDIT' | 'DEBIT'
-- ================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID          REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title       VARCHAR(255)  NOT NULL,
    description TEXT,
    amount      DECIMAL(10,2) NOT NULL,
    type        VARCHAR(50)   DEFAULT 'CREDIT',
    status      VARCHAR(50)   DEFAULT 'COMPLETED',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON wallet_transactions(user_id);


-- ================================================================
-- TABLE: notifications
-- In-app notifications (order updates, offers, alerts)
-- ================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    data       JSONB        DEFAULT '{}'::jsonb,
    is_read    BOOLEAN      DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;


-- ================================================================
-- TABLE: carts
-- One cart per buyer. Items stored as JSONB array.
-- ================================================================
CREATE TABLE IF NOT EXISTS carts (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID  REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    store_id   UUID,                              -- FK added after stores table is created
    items      JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ================================================================
-- TABLE: orders
-- Placed orders by buyers from a store
-- status: PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED
-- ================================================================
CREATE TABLE IF NOT EXISTS orders (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID          REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    store_id            UUID,                         -- FK added after stores table is created
    address_id          UUID          REFERENCES addresses(id) ON DELETE SET NULL,
    status              VARCHAR(50)   DEFAULT 'PLACED'
                        CHECK (status IN ('PLACED','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')),
    subtotal            DECIMAL(10,2) NOT NULL,
    delivery_fee        DECIMAL(10,2) DEFAULT 0.00,
    total_amount        DECIMAL(10,2) NOT NULL,
    payment_status      VARCHAR(50)   DEFAULT 'PENDING',
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_orders_user_id  ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);


-- ================================================================
-- TABLE: order_items
-- Each line item in an order (product + qty + price snapshot)
-- ================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id          UUID          REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id        UUID,                           -- FK added after products table
    quantity          INT           NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);


-- ================================================================
-- TABLE: invoices
-- GST invoice generated per order
-- ================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id         UUID          REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    invoice_number   VARCHAR(100)  UNIQUE NOT NULL,
    seller_state     VARCHAR(100)  DEFAULT 'Gujarat',
    customer_state   VARCHAR(100)  NOT NULL,
    cgst             DECIMAL(10,2) DEFAULT 0.00,
    sgst             DECIMAL(10,2) DEFAULT 0.00,
    igst             DECIMAL(10,2) DEFAULT 0.00,
    delivery_charges DECIMAL(10,2) DEFAULT 0.00,
    discount         DECIMAL(10,2) DEFAULT 0.00,
    total_tax        DECIMAL(10,2) DEFAULT 0.00,
    final_amount     DECIMAL(10,2) NOT NULL,
    invoice_pdf_url  TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);


-- ================================================================
-- TABLE: payments
-- Razorpay payment records linked to an order
-- ================================================================
CREATE TABLE IF NOT EXISTS payments (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID          REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id   VARCHAR(100),
    payment_method      VARCHAR(50)   DEFAULT 'Razorpay',
    payment_status      VARCHAR(50)   DEFAULT 'PENDING',
    amount              DECIMAL(10,2) NOT NULL,
    refund_status       VARCHAR(50)   DEFAULT 'NONE',
    refund_amount       DECIMAL(10,2) DEFAULT 0.00,
    raw_details         JSONB         DEFAULT '{}'::jsonb,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);


-- ================================================================
-- TABLE: chat_threads / chats / chat_messages
-- Buyer ↔ Vendor / Service Provider messaging
-- ================================================================
CREATE TABLE IF NOT EXISTS chat_threads (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID          REFERENCES users(id) ON DELETE CASCADE,
    vendor_id    UUID          NOT NULL,
    vendor_name  VARCHAR(255)  NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category     VARCHAR(100),
    price        DECIMAL(10,2),
    provider_id  UUID,
    last_message TEXT,
    timestamp    VARCHAR(50),
    messages     JSONB         DEFAULT '[]'::jsonb,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS chats (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID          REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    vendor_id    UUID          NOT NULL,
    vendor_name  VARCHAR(255)  NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category     VARCHAR(100),
    price        DECIMAL(10,2),
    provider_id  UUID,
    last_message TEXT,
    timestamp    VARCHAR(50),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id    UUID        REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
    sender     VARCHAR(50) NOT NULL,
    text       TEXT        NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id         ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_all"               ON users;
DROP POLICY IF EXISTS "addresses_all"           ON addresses;
DROP POLICY IF EXISTS "wallet_transactions_all" ON wallet_transactions;
DROP POLICY IF EXISTS "notifications_all"       ON notifications;
DROP POLICY IF EXISTS "service_areas_all"       ON service_areas;
DROP POLICY IF EXISTS "carts_all"               ON carts;
DROP POLICY IF EXISTS "orders_all"              ON orders;
DROP POLICY IF EXISTS "order_items_all"         ON order_items;
DROP POLICY IF EXISTS "invoices_all"            ON invoices;
DROP POLICY IF EXISTS "payments_all"            ON payments;
DROP POLICY IF EXISTS "chat_threads_all"        ON chat_threads;
DROP POLICY IF EXISTS "chats_all"               ON chats;
DROP POLICY IF EXISTS "chat_messages_all"       ON chat_messages;

CREATE POLICY "users_all"               ON users               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "addresses_all"           ON addresses           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "wallet_transactions_all" ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notifications_all"       ON notifications       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_areas_all"       ON service_areas       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "carts_all"               ON carts               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "orders_all"              ON orders              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "order_items_all"         ON order_items         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "invoices_all"            ON invoices            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "payments_all"            ON payments            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chat_threads_all"        ON chat_threads        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chats_all"              ON chats               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_all"      ON chat_messages       FOR ALL USING (true) WITH CHECK (true);

-- Grant anon read access to users/addresses (needed for frontend auth sync)
GRANT SELECT ON public.users     TO anon, authenticated;
GRANT SELECT ON public.addresses TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 01_users_buyers.sql
