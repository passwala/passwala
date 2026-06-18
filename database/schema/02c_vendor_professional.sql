-- ================================================================
-- PASSWALA — 02c: VENDOR SIDE — PROFESSIONAL / SERVICE PROVIDER
-- ================================================================
-- Tables:
--   service_categories → Lookup: Plumbing, Electrical, Cleaning, etc.
--   service_providers  → Professional's account (KYC + profile)
--   services           → Individual services they offer
--   service_bookings   → Buyer books at-home appointment
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: service_categories
-- ================================================================
CREATE TABLE IF NOT EXISTS public.service_categories (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    -- e.g. 'Appliance Repair' | 'Home Cleaning' | 'Plumbing Services'
    --       'Electrical Works' | 'Salon at Home' | 'Pest Control' | 'Home Painting'
    icon_url   TEXT,        -- Lucide icon name e.g. 'Wrench', 'Sparkles'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories
INSERT INTO public.service_categories (name, icon_url) VALUES
    ('Appliance Repair',  'Wrench'),
    ('Home Cleaning',     'Sparkles'),
    ('Plumbing Services', 'Droplets'),
    ('Electrical Works',  'Bolt'),
    ('Salon at Home',     'Scissors'),
    ('Pest Control',      'Bug'),
    ('Home Painting',     'PaintBucket'),
    ('AC Service',        'Wind'),
    ('Carpentry',         'Hammer'),
    ('Laundry',           'ShoppingBag')
ON CONFLICT (name) DO NOTHING;


-- ================================================================
-- TABLE: service_providers
-- Professional / tradesperson (plumber, cleaner, beautician, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.service_providers (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone             VARCHAR(20),
    name              VARCHAR(255),
    full_name         VARCHAR(255),
    business_name     VARCHAR(255),
    about             TEXT,
    address           TEXT,
    license_no        VARCHAR(100),
    category          VARCHAR(100),
    aadhar_no         VARCHAR(20),
    rating            DECIMAL(3,2) DEFAULT 0.0,
    is_verified       BOOLEAN      DEFAULT FALSE,
    profile_completed BOOLEAN      DEFAULT FALSE,
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_sp_updated_at ON public.service_providers;
CREATE TRIGGER trg_sp_updated_at
    BEFORE UPDATE ON public.service_providers
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_sp_user_id ON public.service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_phone   ON public.service_providers(phone);
CREATE INDEX IF NOT EXISTS idx_sp_cat     ON public.service_providers(category);


-- ================================================================
-- TABLE: services
-- Individual services offered by a provider
-- ================================================================
CREATE TABLE IF NOT EXISTS public.services (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id      UUID          REFERENCES public.service_providers(id) ON DELETE CASCADE NOT NULL,
    category_id      UUID          REFERENCES public.service_categories(id) ON DELETE SET NULL,
    title            VARCHAR(255)  NOT NULL,
    description      TEXT,
    image_url        TEXT,
    price            DECIMAL(10,2) NOT NULL,
    duration_minutes INT,
    is_active        BOOLEAN       DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);


-- ================================================================
-- TABLE: service_bookings
-- Buyer books a professional service at home
-- status: PENDING → ACCEPTED → COMPLETED | CANCELLED
-- ================================================================
CREATE TABLE IF NOT EXISTS public.service_bookings (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID          REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_id   UUID          REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    provider_id  UUID          REFERENCES public.service_providers(id) ON DELETE SET NULL,
    address_id   UUID          REFERENCES public.addresses(id) ON DELETE SET NULL,
    status       VARCHAR(50)   DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','ACCEPTED','COMPLETED','CANCELLED')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(10,2),
    notes        TEXT,                               -- Special instructions from buyer
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_sb_updated_at ON public.service_bookings;
CREATE TRIGGER trg_sb_updated_at
    BEFORE UPDATE ON public.service_bookings
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_sb_user_id     ON public.service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_provider_id ON public.service_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_sb_status      ON public.service_bookings(status);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_categories_all" ON public.service_categories;
DROP POLICY IF EXISTS "service_providers_all"  ON public.service_providers;
DROP POLICY IF EXISTS "services_all"           ON public.services;
DROP POLICY IF EXISTS "service_bookings_all"   ON public.service_bookings;

CREATE POLICY "service_categories_all" ON public.service_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_providers_all"  ON public.service_providers  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "services_all"           ON public.services           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_bookings_all"   ON public.service_bookings   FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 02c_vendor_professional.sql
