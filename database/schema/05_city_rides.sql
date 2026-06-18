-- ================================================================
-- PASSWALA — 05: CITY RIDES
-- ================================================================
-- Tables:
--   city_routes      → Saved Ahmedabad bus / auto routes
--   city_vehicles    → Registered vehicles (driver + seats)
--   ticket_bookings  → Buyer books a seat with QR code
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: city_routes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.city_routes (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_area       VARCHAR(100) NOT NULL,
    end_area         VARCHAR(100) NOT NULL,
    distance_km      FLOAT        NOT NULL,
    base_price       FLOAT        NOT NULL,
    path_coordinates JSONB        NOT NULL DEFAULT '[]'::jsonb,
    is_active        BOOLEAN      DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_routes_active ON public.city_routes(is_active);

GRANT SELECT ON public.city_routes TO anon, authenticated;


-- ================================================================
-- TABLE: city_vehicles
-- vehicle_type: 'Bike' | 'Auto' | 'Mini Bus' | 'E-Rickshaw'
-- ================================================================
CREATE TABLE IF NOT EXISTS public.city_vehicles (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id            UUID         REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_type         VARCHAR(50)  NOT NULL,
    license_plate        VARCHAR(20)  NOT NULL UNIQUE,
    total_seats          INTEGER      NOT NULL,
    available_seats      INTEGER      NOT NULL,
    current_lat          FLOAT,
    current_lng          FLOAT,
    is_active            BOOLEAN      DEFAULT TRUE,
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_vehicles_active    ON public.city_vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_city_vehicles_driver_id ON public.city_vehicles(driver_id);

GRANT SELECT ON public.city_vehicles TO anon, authenticated;


-- ================================================================
-- TABLE: ticket_bookings
-- Each booking gets a unique QR hash
-- luggage_weight / luggage_price: extra luggage charge
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ticket_bookings (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    route_id       UUID         REFERENCES public.city_routes(id) ON DELETE SET NULL,
    vehicle_id     UUID         REFERENCES public.city_vehicles(id) ON DELETE SET NULL,
    pickup_area    VARCHAR(100) NOT NULL,
    drop_area      VARCHAR(100) NOT NULL,
    pickup_lat     FLOAT        NOT NULL,
    pickup_lng     FLOAT        NOT NULL,
    drop_lat       FLOAT        NOT NULL,
    drop_lng       FLOAT        NOT NULL,
    total_price    FLOAT        NOT NULL,
    seat_count     INTEGER      NOT NULL,
    seat_numbers   JSONB        DEFAULT '[]'::jsonb,
    status         VARCHAR(20)  DEFAULT 'CONFIRMED'
                   CHECK (status IN ('CONFIRMED','CANCELLED','COMPLETED')),
    qr_code_hash   VARCHAR(255) UNIQUE NOT NULL,
    luggage_weight FLOAT        DEFAULT 0,             -- kg
    luggage_price  FLOAT        DEFAULT 0,             -- ₹ extra for luggage
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_bookings_user_id ON public.ticket_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_bookings_status  ON public.ticket_bookings(status);

-- Add luggage columns if upgrading
ALTER TABLE public.ticket_bookings ADD COLUMN IF NOT EXISTS luggage_weight FLOAT DEFAULT 0;
ALTER TABLE public.ticket_bookings ADD COLUMN IF NOT EXISTS luggage_price  FLOAT DEFAULT 0;


-- ================================================================
-- ROW LEVEL SECURITY
-- Open policy — Express backend handles auth
-- ================================================================
ALTER TABLE public.city_routes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_vehicles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "city_routes_all"     ON public.city_routes;
DROP POLICY IF EXISTS "city_vehicles_all"   ON public.city_vehicles;
DROP POLICY IF EXISTS "ticket_bookings_all" ON public.ticket_bookings;

CREATE POLICY "city_routes_all"     ON public.city_routes     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "city_vehicles_all"   ON public.city_vehicles   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ticket_bookings_all" ON public.ticket_bookings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 05_city_rides.sql
