-- ================================================================
-- PASSWALA — 02b: VENDOR SIDE — EVENT ORGANIZER
-- ================================================================
-- Tables:
--   events             → Events created by organizer vendors
--   event_ticket_tiers → VIP / General / Couple / Premium tiers
--                        with booking open/close window per tier
--   event_bookings     → Buyer ticket purchases (with QR + invoice)
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: events
-- Events published by a vendor (event organizer role)
-- status: UPCOMING | ONGOING | COMPLETED | CANCELLED | SOLD_OUT
-- ================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(100) NOT NULL,
    -- e.g. 'Music & Concerts' | 'Comedy & Theatre' | 'Workshops & Classes'
    --       'Parties & Nightlife' | 'Festivals & Fairs' | 'Sports & Fitness'
    --       'Corporate & Business' | 'Other Events'
    venue_name  VARCHAR(255) NOT NULL,
    venue_lat   FLOAT        NOT NULL,
    venue_lng   FLOAT        NOT NULL,
    event_date  TIMESTAMP WITH TIME ZONE NOT NULL,   -- When the event happens
    banner_url  TEXT,
    status      VARCHAR(50)  DEFAULT 'UPCOMING'
                CHECK (status IN ('UPCOMING','ONGOING','COMPLETED','CANCELLED','SOLD_OUT')),
    created_by  UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    booking_start TIMESTAMP WITH TIME ZONE,          -- Overall event booking open
    booking_end   TIMESTAMP WITH TIME ZONE,          -- Overall event booking close
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status     ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);


-- ================================================================
-- TABLE: event_ticket_tiers
-- Each event has multiple ticket tiers (General, VIP, Couple, etc.)
--
-- booking_open  → Full datetime when this tier's booking opens
-- booking_close → Full datetime when this tier's booking closes
--                 After booking_close passes on ALL tiers,
--                 the event is auto-hidden from the buyer listing.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.event_ticket_tiers (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID         REFERENCES public.events(id) ON DELETE CASCADE,
    tier_name       VARCHAR(100) NOT NULL,
    -- e.g. 'General Admission' | 'VIP' | 'Premium' | 'Couple'
    price           FLOAT        NOT NULL,
    total_seats     INTEGER      NOT NULL,
    available_seats INTEGER      NOT NULL,
    -- Booking window: full datetime (set by vendor in the event form)
    booking_open    TIMESTAMP WITH TIME ZONE,   -- When bookings open for this tier
    booking_close   TIMESTAMP WITH TIME ZONE,   -- When bookings close for this tier
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, tier_name)
);

CREATE INDEX IF NOT EXISTS idx_event_tiers_event_id ON public.event_ticket_tiers(event_id);

-- Migration safety: drop old TIME-only columns if upgrading existing DB
ALTER TABLE public.event_ticket_tiers
    DROP COLUMN IF EXISTS booking_open_time,
    DROP COLUMN IF EXISTS booking_close_time;

-- Add new columns if they don't exist yet (safe migration)
ALTER TABLE public.event_ticket_tiers
    ADD COLUMN IF NOT EXISTS booking_open  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS booking_close TIMESTAMP WITH TIME ZONE;


-- ================================================================
-- TABLE: event_bookings
-- Buyer purchases tickets for a specific event tier
-- Each booking gets a unique QR hash and invoice number
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
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_bookings_user_id  ON public.event_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_id ON public.event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_tier_id  ON public.event_bookings(tier_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_all"             ON public.events;
DROP POLICY IF EXISTS "event_tiers_all"        ON public.event_ticket_tiers;
DROP POLICY IF EXISTS "event_bookings_all"     ON public.event_bookings;

-- Open policies — access control enforced in Express backend
CREATE POLICY "events_all"         ON public.events             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "event_tiers_all"    ON public.event_ticket_tiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "event_bookings_all" ON public.event_bookings     FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 02b_vendor_event_organizer.sql
