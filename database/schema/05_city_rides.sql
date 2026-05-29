-- Ahmedabad City Ticket Booking Schema

-- 1. Routes Table
CREATE TABLE IF NOT EXISTS public.city_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_area VARCHAR(100) NOT NULL,
    end_area VARCHAR(100) NOT NULL,
    distance_km FLOAT NOT NULL,
    base_price FLOAT NOT NULL,
    path_coordinates JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We can insert initial Ahmedabad routes here (CG Road, Maninagar, etc.) 
-- later using the backend or manually via a seeder.

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS public.city_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL, -- 'Mini Bus', 'Auto', 'E-Rickshaw'
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    current_lat FLOAT,
    current_lng FLOAT,
    is_active BOOLEAN DEFAULT true,
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ticket Bookings Table
CREATE TABLE IF NOT EXISTS public.ticket_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    route_id UUID REFERENCES public.city_routes(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.city_vehicles(id) ON DELETE SET NULL,
    pickup_area VARCHAR(100) NOT NULL,
    drop_area VARCHAR(100) NOT NULL,
    pickup_lat FLOAT NOT NULL,
    pickup_lng FLOAT NOT NULL,
    drop_lat FLOAT NOT NULL,
    drop_lng FLOAT NOT NULL,
    total_price FLOAT NOT NULL,
    seat_count INTEGER NOT NULL,
    seat_numbers JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
    qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.city_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_bookings ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Anyone can view active routes
CREATE POLICY "Anyone can view active routes" ON public.city_routes FOR SELECT USING (is_active = true);

-- Anyone can view active vehicles
CREATE POLICY "Anyone can view active vehicles" ON public.city_vehicles FOR SELECT USING (is_active = true);

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON public.ticket_bookings FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bookings
CREATE POLICY "Users can insert bookings" ON public.ticket_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (for cancellations)
CREATE POLICY "Users can update own bookings" ON public.ticket_bookings FOR UPDATE USING (auth.uid() = user_id);
