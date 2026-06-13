-- ================================================================
-- PASSWALA — 03: RIDER SIDE
-- ================================================================
-- Tables:
--   riders             → Rider profile (KYC, vehicle, rating)
--   rider_locations    → Live GPS location (one row per rider)
--   rider_earnings     → Per-delivery payout record
--   delivery_tracking  → Order delivery journey with GPS steps
--
-- ⚠️  Run AFTER 01_users_buyers.sql (riders depend on users + orders)
-- ⚠️  Run AFTER 02a_vendor_shop.sql (delivery_tracking depends on orders)
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: riders
-- Rider's profile — linked to their users account
-- is_active = TRUE means they are currently on-duty
-- is_verified = TRUE means admin has approved their KYC
-- ================================================================
CREATE TABLE IF NOT EXISTS riders (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone            VARCHAR(20),                     -- Denormalized for quick lookup
    vehicle_no       VARCHAR(50)  NOT NULL DEFAULT 'Pending',  -- Number plate
    license_no       VARCHAR(100) NOT NULL DEFAULT 'Pending',  -- Driving license no.
    id_proof         VARCHAR(100) NOT NULL DEFAULT 'Pending',  -- Aadhaar / PAN ref
    is_active        BOOLEAN      DEFAULT FALSE,      -- Currently on duty?
    is_verified      BOOLEAN      DEFAULT FALSE,      -- Admin approved?
    rating           DECIMAL(3,2) DEFAULT 0.0,        -- Customer average rating
    total_deliveries INT          DEFAULT 0,           -- Lifetime delivery count
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_riders_updated_at ON riders;
CREATE TRIGGER trg_riders_updated_at
    BEFORE UPDATE ON riders
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_riders_user_id ON riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_phone   ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_riders_active  ON riders(is_active, is_verified);


-- ================================================================
-- TABLE: rider_locations
-- Real-time GPS location — ONE row per rider, continuously updated.
-- Used for live tracking map in buyer and admin views.
-- status: 'ONLINE' | 'OFFLINE' | 'BUSY'
-- ================================================================
CREATE TABLE IF NOT EXISTS rider_locations (
    id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id   UUID          REFERENCES riders(id) ON DELETE CASCADE UNIQUE NOT NULL,
    lat        DECIMAL(10,8) NOT NULL,
    lng        DECIMAL(11,8) NOT NULL,
    status     VARCHAR(50)   DEFAULT 'OFFLINE',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_loc_rider_id ON rider_locations(rider_id);


-- ================================================================
-- TABLE: rider_earnings
-- Per-delivery earning record for each rider
-- payout_status: 'PENDING' | 'PAID'
-- ================================================================
CREATE TABLE IF NOT EXISTS rider_earnings (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id      UUID          REFERENCES riders(id) ON DELETE CASCADE NOT NULL,
    order_id      UUID          REFERENCES orders(id) ON DELETE SET NULL,
    amount        DECIMAL(10,2) NOT NULL,
    payout_status VARCHAR(50)   DEFAULT 'PENDING',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_earn_rider_id ON rider_earnings(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_earn_order_id ON rider_earnings(order_id);


-- ================================================================
-- TABLE: delivery_tracking
-- Links each order to its assigned rider.
-- tracking_steps stores the GPS log as a JSONB array.
-- status: PENDING → ASSIGNED → PICKED_UP → DELIVERED
-- ================================================================
CREATE TABLE IF NOT EXISTS delivery_tracking (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id       UUID          REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    rider_id       UUID          REFERENCES riders(id) ON DELETE SET NULL,
    current_lat    DECIMAL(10,8),
    current_lng    DECIMAL(11,8),
    status         VARCHAR(50)   DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','ASSIGNED','PICKED_UP','DELIVERED')),
    tracking_steps JSONB         DEFAULT '[]'::jsonb,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_dt_updated_at ON delivery_tracking;
CREATE TRIGGER trg_dt_updated_at
    BEFORE UPDATE ON delivery_tracking
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_dt_order_id ON delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_dt_rider_id ON delivery_tracking(rider_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE riders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_earnings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "riders_all"            ON riders;
DROP POLICY IF EXISTS "rider_locations_all"   ON rider_locations;
DROP POLICY IF EXISTS "rider_earnings_all"    ON rider_earnings;
DROP POLICY IF EXISTS "delivery_tracking_all" ON delivery_tracking;

CREATE POLICY "riders_all"            ON riders            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rider_locations_all"   ON rider_locations   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rider_earnings_all"    ON rider_earnings    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "delivery_tracking_all" ON delivery_tracking FOR ALL USING (true) WITH CHECK (true);


-- ================================================================
-- REALTIME — Enable live GPS tracking updates
-- ================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE rider_locations;
        ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tracking;
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'supabase_realtime not configured — skipping';
END $$;

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 03_riders.sql
