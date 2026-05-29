-- Program & Event Ticket Booking Schema

-- 1. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    venue_lat FLOAT NOT NULL,
    venue_lng FLOAT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    banner_url TEXT,
    status VARCHAR(50) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'SOLD_OUT')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Event Ticket Tiers (VIP, Premium, Normal)
CREATE TABLE IF NOT EXISTS public.event_ticket_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    tier_name VARCHAR(100) NOT NULL,
    price FLOAT NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, tier_name)
);

-- 3. Event Bookings Table
CREATE TABLE IF NOT EXISTS public.event_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.event_ticket_tiers(id) ON DELETE SET NULL,
    ticket_count INTEGER NOT NULL,
    base_amount FLOAT NOT NULL,
    cgst_amount FLOAT NOT NULL,
    sgst_amount FLOAT NOT NULL,
    total_amount FLOAT NOT NULL,
    status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
    qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Anyone can view active events
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (status != 'CANCELLED');

-- Anyone can view event tiers
CREATE POLICY "Anyone can view event tiers" ON public.event_ticket_tiers FOR SELECT USING (true);

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON public.event_bookings FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bookings
CREATE POLICY "Users can insert bookings" ON public.event_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (for cancellations)
CREATE POLICY "Users can update own bookings" ON public.event_bookings FOR UPDATE USING (auth.uid() = user_id);
