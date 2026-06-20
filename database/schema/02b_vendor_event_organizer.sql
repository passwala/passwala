-- ================================================================
-- PASSWALA — 02b: VENDOR SIDE — EVENT ORGANIZER
-- ================================================================
-- Tables:
--   events                  → Events published by organizer vendors
--   event_ticket_tiers      → VIP / General / Couple / Premium tiers
--                             with booking open/close datetime per tier
--   event_bookings          → Buyer ticket purchases (QR + invoice)
--   event_organizer_requests→ Vendor upgrade requests (pay to unlock console)
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: events
-- status: UPCOMING | ONGOING | COMPLETED | CANCELLED | SOLD_OUT
-- approval_status: PENDING | APPROVED | REJECTED  (admin gate)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100) NOT NULL,
    -- e.g. 'Music & Concerts' | 'Comedy & Theatre' | 'Workshops & Classes'
    --       'Parties & Nightlife' | 'Festivals & Fairs' | 'Sports & Fitness'
    --       'Corporate & Business' | 'Other Events'
    venue_name      VARCHAR(255) NOT NULL,
    venue_lat       FLOAT        NOT NULL,
    venue_lng       FLOAT        NOT NULL,
    event_date      TIMESTAMP WITH TIME ZONE NOT NULL,
    banner_url      TEXT,
    status          VARCHAR(50)  DEFAULT 'UPCOMING'
                    CHECK (status IN ('UPCOMING','ONGOING','COMPLETED','CANCELLED','SOLD_OUT')),
    approval_status VARCHAR(50)  DEFAULT 'PENDING'
                    CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
    show_type       VARCHAR(20)  DEFAULT 'single'
                    CHECK (show_type IN ('single','multiple','tour')),
    created_by      UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    booking_start   TIMESTAMP WITH TIME ZONE,
    booking_end     TIMESTAMP WITH TIME ZONE,
    visibility      VARCHAR(50)  DEFAULT 'public',
    is_online       BOOLEAN      DEFAULT FALSE,
    ends_at         TIMESTAMP WITH TIME ZONE,
    duration        VARCHAR(100),
    age_restriction VARCHAR(100),
    language        VARCHAR(100),
    is_admin_organized BOOLEAN      DEFAULT FALSE,
    allowed_scanner_id UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add columns if upgrading existing DB before index creation
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS show_type VARCHAR(20) DEFAULT 'single' CHECK (show_type IN ('single','multiple','tour'));
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
    ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(100),
    ADD COLUMN IF NOT EXISTS language VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_admin_organized BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS allowed_scanner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_status          ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON public.events(approval_status);
CREATE INDEX IF NOT EXISTS idx_events_created_by      ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_event_date      ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_show_type        ON public.events(show_type);

GRANT SELECT ON public.events TO anon, authenticated;


-- ================================================================
-- TABLE: event_ticket_tiers
-- Each event has multiple tiers (General, VIP, Couple, Premium)
-- booking_open / booking_close → full datetime (set by vendor)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.event_ticket_tiers (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID         REFERENCES public.events(id) ON DELETE CASCADE,
    tier_name       VARCHAR(100) NOT NULL,
    -- e.g. 'General Admission' | 'VIP' | 'Premium' | 'Couple'
    price           FLOAT        NOT NULL,
    total_seats     INTEGER      NOT NULL,
    available_seats INTEGER      NOT NULL,
    booking_open    TIMESTAMP WITH TIME ZONE,
    booking_close   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, tier_name)
);

-- Safe migration: remove old TIME-only columns if upgrading
ALTER TABLE public.event_ticket_tiers DROP COLUMN IF EXISTS booking_open_time;
ALTER TABLE public.event_ticket_tiers DROP COLUMN IF EXISTS booking_close_time;

-- Add datetime columns if upgrading
ALTER TABLE public.event_ticket_tiers ADD COLUMN IF NOT EXISTS booking_open  TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.event_ticket_tiers ADD COLUMN IF NOT EXISTS booking_close TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_event_tiers_event_id ON public.event_ticket_tiers(event_id);

GRANT SELECT ON public.event_ticket_tiers TO anon, authenticated;


-- ================================================================
-- TABLE: event_bookings
-- Each booking = QR hash + invoice number + checked-in status
-- ================================================================
CREATE TABLE IF NOT EXISTS public.event_bookings (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    event_id       UUID         REFERENCES public.events(id) ON DELETE CASCADE,
    tier_id        UUID         REFERENCES public.event_ticket_tiers(id) ON DELETE SET NULL,
    ticket_count   INTEGER      NOT NULL,
    base_amount    FLOAT        NOT NULL,              -- Pre-tax amount
    cgst_amount    FLOAT        NOT NULL,              -- 9% CGST
    sgst_amount    FLOAT        NOT NULL,              -- 9% SGST
    total_amount   FLOAT        NOT NULL,              -- Final ₹ charged
    status         VARCHAR(20)  DEFAULT 'CONFIRMED'
                   CHECK (status IN ('CONFIRMED','CANCELLED','COMPLETED')),
    qr_code_hash   VARCHAR(255) UNIQUE NOT NULL,       -- QR ticket identifier
    invoice_number VARCHAR(100) UNIQUE NOT NULL,       -- e.g. PW-EVT-2026-0001
    checked_in     BOOLEAN      DEFAULT FALSE,         -- TRUE after QR scan at venue
    checked_in_at  TIMESTAMP WITH TIME ZONE,           -- Timestamp of check-in
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add checked_in columns if upgrading
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS checked_in    BOOLEAN   DEFAULT FALSE;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_event_bookings_user_id  ON public.event_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_id ON public.event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_tier_id  ON public.event_bookings(tier_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_qr       ON public.event_bookings(qr_code_hash);


-- ================================================================
-- TABLE: event_organizer_requests
-- Vendor pays upgrade fee to unlock Event / Service / Rental console
-- ================================================================
CREATE TABLE IF NOT EXISTS public.event_organizer_requests (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID          REFERENCES public.users(id) ON DELETE CASCADE,
    phone          VARCHAR(20)   NOT NULL,
    business_name  VARCHAR(255)  NOT NULL,
    aadhar_no      VARCHAR(20),
    payment_status VARCHAR(50)   DEFAULT 'PENDING',    -- PENDING | PAID | FAILED
    payment_id     VARCHAR(100),                        -- Razorpay Payment ID
    request_status VARCHAR(50)   DEFAULT 'SUBMITTED',  -- SUBMITTED | APPROVED | REJECTED
    amount         DECIMAL(10,2) DEFAULT 999.00,        -- Admin-configured setup fee
    target_console VARCHAR(50)   DEFAULT 'event',       -- event | service | rental | shop
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_upgrade_updated_at ON public.event_organizer_requests;
CREATE TRIGGER trg_upgrade_updated_at
    BEFORE UPDATE ON public.event_organizer_requests
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_upgrade_user_id ON public.event_organizer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_status  ON public.event_organizer_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_upgrade_console ON public.event_organizer_requests(target_console);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.events                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_tiers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_all"             ON public.events;
DROP POLICY IF EXISTS "event_tiers_all"        ON public.event_ticket_tiers;
DROP POLICY IF EXISTS "event_bookings_all"     ON public.event_bookings;
DROP POLICY IF EXISTS "upgrade_requests_all"   ON public.event_organizer_requests;

CREATE POLICY "events_all"           ON public.events                   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "event_tiers_all"      ON public.event_ticket_tiers       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "event_bookings_all"   ON public.event_bookings           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "upgrade_requests_all" ON public.event_organizer_requests FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- Enable Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'events'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'event_ticket_tiers'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.event_ticket_tiers;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'supabase_realtime not configured — skipping';
END $$;

-- ✅ Done: 02b_vendor_event_organizer.sql
