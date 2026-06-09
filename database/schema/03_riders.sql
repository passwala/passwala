-- ================================================================
-- PASSWALA — RIDERS TABLE SETUP
-- ================================================================
-- This file creates all rider-related tables:
-- riders, rider_locations, rider_earnings, delivery_tracking
--
-- ⚠️  Run AFTER 01_users_buyers.sql (riders depend on users table)
-- ⚠️  Run AFTER 02_vendors.sql     (delivery_tracking depends on orders)
-- Run in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- TABLE: riders
-- Rider profile — linked to a user account
-- ================================================================
CREATE TABLE IF NOT EXISTS riders (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone            VARCHAR(20),                  -- 10-digit, no +91 (denormalized for quick lookup)
    vehicle_no       VARCHAR(50)  NOT NULL DEFAULT 'Pending',
    license_no       VARCHAR(100) NOT NULL DEFAULT 'Pending',
    id_proof         VARCHAR(100) NOT NULL DEFAULT 'Pending',  -- Aadhar / DL reference
    is_active        BOOLEAN      DEFAULT FALSE,   -- Is rider currently online?
    is_verified      BOOLEAN      DEFAULT FALSE,   -- Admin approved?
    rating           DECIMAL(3,2) DEFAULT 0.0,
    total_deliveries INT          DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: rider_locations
-- Real-time GPS location of each rider (one row per rider)
-- ================================================================
CREATE TABLE IF NOT EXISTS rider_locations (
    id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id  UUID         REFERENCES riders(id) ON DELETE CASCADE UNIQUE NOT NULL,
    lat       DECIMAL(10,8) NOT NULL,
    lng       DECIMAL(11,8) NOT NULL,
    status    VARCHAR(50)  DEFAULT 'OFFLINE',
    -- status: 'ONLINE' | 'OFFLINE' | 'BUSY'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: rider_earnings
-- Per-delivery payout record for each rider
-- ================================================================
CREATE TABLE IF NOT EXISTS rider_earnings (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id      UUID         REFERENCES riders(id) ON DELETE CASCADE NOT NULL,
    order_id      UUID         REFERENCES orders(id) ON DELETE SET NULL,
    amount        DECIMAL(10,2) NOT NULL,
    payout_status VARCHAR(50)  DEFAULT 'PENDING',
    -- status: 'PENDING' | 'PAID'
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TABLE: delivery_tracking
-- Live order tracking — links order ↔ rider with GPS steps
-- ================================================================
CREATE TABLE IF NOT EXISTS delivery_tracking (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id       UUID         REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    rider_id       UUID         REFERENCES riders(id) ON DELETE SET NULL,
    current_lat    DECIMAL(10,8),
    current_lng    DECIMAL(11,8),
    status         VARCHAR(50)  DEFAULT 'PENDING',
    -- status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED'
    tracking_steps JSONB        DEFAULT '[]'::jsonb,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES — Riders & Related
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_riders_user_id        ON riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_phone          ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_riders_active         ON riders(is_active, is_verified);
CREATE INDEX IF NOT EXISTS idx_rider_loc_rider_id    ON rider_locations(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_earn_rider_id   ON rider_earnings(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_earn_order_id   ON rider_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_dt_order_id           ON delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_dt_rider_id           ON delivery_tracking(rider_id);

-- ================================================================
-- TRIGGER — Auto updated_at for riders
-- ================================================================
DROP TRIGGER IF EXISTS trg_riders_updated_at ON riders;
CREATE TRIGGER trg_riders_updated_at
    BEFORE UPDATE ON riders
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_dt_updated_at ON delivery_tracking;
CREATE TRIGGER trg_dt_updated_at
    BEFORE UPDATE ON delivery_tracking
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE riders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_earnings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "riders_all"            ON riders            FOR ALL USING (true);
CREATE POLICY "rider_locations_all"   ON rider_locations   FOR ALL USING (true);
CREATE POLICY "rider_earnings_all"    ON rider_earnings    FOR ALL USING (true);
CREATE POLICY "delivery_tracking_all" ON delivery_tracking FOR ALL USING (true);

-- ================================================================
-- REALTIME — Enable live tracking updates
-- ================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE rider_locations;
        ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tracking;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'supabase_realtime publication not configured — skipping';
END $$;
