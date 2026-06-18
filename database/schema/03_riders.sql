-- ================================================================
-- PASSWALA — 03: RIDER SIDE
-- ================================================================
-- Tables:
--   riders             → Rider profile (KYC, vehicle, rating)
--   rider_locations    → Live GPS location (one row per rider, upserted)
--   rider_earnings     → Per-delivery payout record
--   delivery_tracking  → Order delivery journey with GPS steps
--
-- ⚠️  Run AFTER 01_users_buyers.sql  (riders depend on users + orders)
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: riders
-- is_active = currently on-duty | is_verified = admin KYC approved
-- ================================================================
CREATE TABLE IF NOT EXISTS public.riders (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone            VARCHAR(20),
    vehicle_no       VARCHAR(50)  NOT NULL DEFAULT 'Pending',
    license_no       VARCHAR(100) NOT NULL DEFAULT 'Pending',
    id_proof         VARCHAR(100) NOT NULL DEFAULT 'Pending',
    is_active        BOOLEAN      DEFAULT FALSE,
    is_verified      BOOLEAN      DEFAULT FALSE,
    rating           DECIMAL(3,2) DEFAULT 0.0,
    total_deliveries INT          DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_riders_updated_at ON public.riders;
CREATE TRIGGER trg_riders_updated_at
    BEFORE UPDATE ON public.riders
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_riders_user_id ON public.riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_phone   ON public.riders(phone);
CREATE INDEX IF NOT EXISTS idx_riders_active  ON public.riders(is_active, is_verified);


-- ================================================================
-- TABLE: rider_locations
-- Real-time GPS — ONE row per rider, upserted continuously
-- status: ONLINE | OFFLINE | BUSY
-- ================================================================
CREATE TABLE IF NOT EXISTS public.rider_locations (
    id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id   UUID          REFERENCES public.riders(id) ON DELETE CASCADE UNIQUE NOT NULL,
    lat        DECIMAL(10,8) NOT NULL,
    lng        DECIMAL(11,8) NOT NULL,
    status     VARCHAR(50)   DEFAULT 'OFFLINE',
    heading    FLOAT,                                 -- Direction in degrees (0-360)
    speed_kmh  FLOAT,                                 -- Current speed
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_loc_rider_id ON public.rider_locations(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_loc_status   ON public.rider_locations(status);


-- ================================================================
-- TABLE: rider_earnings
-- ================================================================
CREATE TABLE IF NOT EXISTS public.rider_earnings (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id      UUID          REFERENCES public.riders(id) ON DELETE CASCADE NOT NULL,
    order_id      UUID          REFERENCES public.orders(id) ON DELETE SET NULL,
    amount        DECIMAL(10,2) NOT NULL,
    payout_status VARCHAR(50)   DEFAULT 'PENDING',  -- PENDING | PAID
    paid_at       TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_earn_rider_id ON public.rider_earnings(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_earn_order_id ON public.rider_earnings(order_id);


-- ================================================================
-- TABLE: delivery_tracking
-- Links each order to its assigned rider; GPS log as JSONB array
-- status: PENDING → ASSIGNED → PICKED_UP → DELIVERED
-- ================================================================
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id       UUID          REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    rider_id       UUID          REFERENCES public.riders(id) ON DELETE SET NULL,
    current_lat    DECIMAL(10,8),
    current_lng    DECIMAL(11,8),
    status         VARCHAR(50)   DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','ASSIGNED','PICKED_UP','DELIVERED')),
    tracking_steps JSONB         DEFAULT '[]'::jsonb,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_dt_updated_at ON public.delivery_tracking;
CREATE TRIGGER trg_dt_updated_at
    BEFORE UPDATE ON public.delivery_tracking
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_dt_order_id ON public.delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_dt_rider_id ON public.delivery_tracking(rider_id);
CREATE INDEX IF NOT EXISTS idx_dt_status   ON public.delivery_tracking(status);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.riders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_earnings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "riders_all"            ON public.riders;
DROP POLICY IF EXISTS "rider_locations_all"   ON public.rider_locations;
DROP POLICY IF EXISTS "rider_earnings_all"    ON public.rider_earnings;
DROP POLICY IF EXISTS "delivery_tracking_all" ON public.delivery_tracking;

CREATE POLICY "riders_all"            ON public.riders            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rider_locations_all"   ON public.rider_locations   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rider_earnings_all"    ON public.rider_earnings    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "delivery_tracking_all" ON public.delivery_tracking FOR ALL USING (true) WITH CHECK (true);


-- ================================================================
-- REALTIME — live GPS tracking
-- ================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'supabase_realtime not configured — skipping';
END $$;

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 03_riders.sql
