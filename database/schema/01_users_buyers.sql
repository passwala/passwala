-- ================================================================
-- PASSWALA — USERS (BUYERS) TABLE SETUP
-- ================================================================
-- This file creates the users table and all related buyer tables:
-- addresses, wallet_transactions, carts, orders, order_items,
-- notifications, and a buyers-only VIEW for the admin panel.
--
-- Run in Supabase SQL Editor
-- ================================================================

-- Enable UUID extension (safe to re-run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop dependent tables first (reverse FK order) ───────────────
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP VIEW  IF EXISTS buyers_view;
DROP TABLE IF EXISTS users CASCADE;

-- ================================================================
-- TABLE: users
-- Stores ALL platform users (role differentiates them)
-- ================================================================
CREATE TABLE users (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone            VARCHAR(20)  UNIQUE NOT NULL,
    full_name        VARCHAR(100),
    email            VARCHAR(255),
    photo_url        TEXT,
    role             VARCHAR(50)  NOT NULL DEFAULT 'BUYER',
    -- role values: 'BUYER' | 'VENDOR' | 'SERVICE_PROVIDER' | 'RIDER' | 'ADMIN'
    uid              VARCHAR(255) UNIQUE,           -- Firebase Auth UID
    wallet_balance   DECIMAL(10,2) DEFAULT 0.00,
    fcm_token        TEXT,                          -- Push notification token
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- VIEW: buyers_view
-- Admin panel and reports use this to see ONLY buyers
-- (role = 'BUYER') — riders and vendors are excluded
-- ================================================================
CREATE OR REPLACE VIEW buyers_view AS
    SELECT
        id,
        phone,
        full_name,
        email,
        photo_url,
        uid,
        wallet_balance,
        fcm_token,
        created_at,
        updated_at
    FROM users
    WHERE role = 'BUYER';

-- ================================================================
-- TABLE: addresses
-- Delivery addresses for buyers
-- ================================================================
CREATE TABLE addresses (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    address_line_1   TEXT         NOT NULL,
    address_line_2   TEXT,
    city             VARCHAR(100),
    state            VARCHAR(100),
    pincode          VARCHAR(10),
    lat              DECIMAL(10,8),
    lng              DECIMAL(11,8),
    is_default       BOOLEAN      DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: wallet_transactions
-- Buyer wallet credit/debit history
-- ================================================================
CREATE TABLE wallet_transactions (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    amount           DECIMAL(10,2) NOT NULL,
    type             VARCHAR(50)  DEFAULT 'CREDIT',  -- 'CREDIT' | 'DEBIT'
    status           VARCHAR(50)  DEFAULT 'COMPLETED',
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: notifications
-- In-app notifications for all roles (filtered by user_id)
-- ================================================================
CREATE TABLE notifications (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title            VARCHAR(255) NOT NULL,
    message          TEXT         NOT NULL,
    data             JSONB        DEFAULT '{}'::jsonb,
    is_read          BOOLEAN      DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES — Users & Related
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_users_phone         ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_uid           ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id   ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user_id      ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_id       ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread        ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ================================================================
-- TRIGGER — Auto-update users.updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION refresh_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION refresh_updated_at_timestamp();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- Open policies (app uses service_role key for backend; anon for client)
CREATE POLICY "users_all"               ON users               FOR ALL USING (true);
CREATE POLICY "addresses_all"           ON addresses           FOR ALL USING (true);
CREATE POLICY "wallet_transactions_all" ON wallet_transactions FOR ALL USING (true);
CREATE POLICY "notifications_all"       ON notifications       FOR ALL USING (true);

-- ================================================================
-- SEED: Default service areas (buyers select from these)
-- ================================================================
CREATE TABLE IF NOT EXISTS service_areas (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    city       VARCHAR(100) DEFAULT 'Ahmedabad',
    area_name  VARCHAR(100) UNIQUE NOT NULL,
    is_active  BOOLEAN      DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_areas_all" ON service_areas FOR ALL USING (true);

INSERT INTO service_areas (area_name, is_active) VALUES
    ('Satellite',        true),
    ('Bopal',            true),
    ('Prahlad Nagar',    true),
    ('Sindhu Bhavan',    true),
    ('Navrangpura',      true),
    ('Gota',             false),
    ('Science City',     false)
ON CONFLICT (area_name) DO NOTHING;
