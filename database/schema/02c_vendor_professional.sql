-- ================================================================
-- PASSWALA — 02c: VENDOR SIDE — PROFESSIONAL / SERVICE PROVIDER
-- ================================================================
-- Tables:
--   service_categories → Lookup: Plumbing, Electrical, Cleaning, etc.
--   service_providers  → Professional's account (KYC + profile)
--   services           → Individual services they offer
--   service_bookings   → Buyer books a service at-home appointment
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: service_categories
-- Lookup table for types of professional services
-- ================================================================
CREATE TABLE IF NOT EXISTS service_categories (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    -- e.g. 'Appliance Repair' | 'Home Cleaning' | 'Plumbing Services'
    --       'Electrical Works' | 'Salon at Home' | 'Pest Control' | 'Home Painting'
    icon_url   TEXT,        -- Lucide icon name e.g. 'Wrench', 'Sparkles'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories
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
-- TABLE: service_providers
-- Professional / tradesperson account
-- (plumber, electrician, cleaner, beautician, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS service_providers (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone             VARCHAR(20),                    -- 10-digit, no +91
    name              VARCHAR(255),                   -- Display name
    full_name         VARCHAR(255),                   -- Legal full name
    business_name     VARCHAR(255),                   -- Brand / service name
    about             TEXT,                           -- Bio / experience
    address           TEXT,                           -- Serviceable area
    license_no        VARCHAR(100),                   -- Trade / professional license
    category          VARCHAR(100),                   -- Main service type
    aadhar_no         VARCHAR(20),                    -- KYC (masked)
    rating            DECIMAL(3,2)  DEFAULT 0.0,      -- Average customer rating
    is_verified       BOOLEAN       DEFAULT FALSE,    -- Admin approved
    profile_completed BOOLEAN       DEFAULT FALSE,
    lat               DOUBLE PRECISION,               -- Service area map pin
    lng               DOUBLE PRECISION,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_sp_updated_at ON service_providers;
CREATE TRIGGER trg_sp_updated_at
    BEFORE UPDATE ON service_providers
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_sp_user_id ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_phone   ON service_providers(phone);


-- ================================================================
-- TABLE: services
-- Individual services offered by a service_provider
-- Buyers can browse and book these at a scheduled time
-- ================================================================
CREATE TABLE IF NOT EXISTS services (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id      UUID          REFERENCES service_providers(id) ON DELETE CASCADE NOT NULL,
    category_id      UUID          REFERENCES service_categories(id) ON DELETE SET NULL,
    title            VARCHAR(255)  NOT NULL,          -- e.g. 'Deep Home Cleaning'
    description      TEXT,
    image_url        TEXT,
    price            DECIMAL(10,2) NOT NULL,
    duration_minutes INT,                             -- Estimated job duration
    is_active        BOOLEAN       DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);


-- ================================================================
-- TABLE: service_bookings
-- Buyer books a professional service at home
-- status: PENDING → ACCEPTED → COMPLETED | CANCELLED
-- ================================================================
CREATE TABLE IF NOT EXISTS service_bookings (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID          REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    service_id   UUID          REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    provider_id  UUID          REFERENCES service_providers(id) ON DELETE SET NULL,
    address_id   UUID          REFERENCES addresses(id) ON DELETE SET NULL,
    status       VARCHAR(50)   DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','ACCEPTED','COMPLETED','CANCELLED')),
    scheduled_at TIMESTAMP WITH TIME ZONE,           -- Appointment date & time
    total_amount DECIMAL(10,2),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sb_user_id     ON service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_provider_id ON service_bookings(provider_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_categories_all" ON service_categories;
DROP POLICY IF EXISTS "service_providers_all"  ON service_providers;
DROP POLICY IF EXISTS "services_all"           ON services;
DROP POLICY IF EXISTS "service_bookings_all"   ON service_bookings;

CREATE POLICY "service_categories_all" ON service_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_providers_all"  ON service_providers  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "services_all"           ON services           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_bookings_all"   ON service_bookings   FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 02c_vendor_professional.sql
