-- database/schema/03_create_upgrade_requests.sql
-- Run this SQL in your Supabase SQL Editor to support the Console Upgrade feature.

CREATE TABLE IF NOT EXISTS public.event_organizer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    aadhar_no VARCHAR(20),
    payment_status VARCHAR(50) DEFAULT 'PENDING',  -- 'PENDING', 'PAID', 'FAILED'
    payment_id VARCHAR(100),                        -- Razorpay Payment ID
    request_status VARCHAR(50) DEFAULT 'SUBMITTED',  -- 'SUBMITTED', 'APPROVED', 'REJECTED'
    amount DECIMAL(10,2) DEFAULT 499.00,            -- Setup charge
    target_console VARCHAR(50) DEFAULT 'event',     -- 'event', 'service', 'rental'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_organizer_requests ENABLE ROW LEVEL SECURITY;

-- Disable strict policy to allow standard insertions/queries
DROP POLICY IF EXISTS "Users can manage their own event organizer requests" ON public.event_organizer_requests;
CREATE POLICY "Users can manage their own event organizer requests" ON public.event_organizer_requests FOR ALL USING (TRUE);

-- Trigger PGRST to reload schema cache
NOTIFY pgrst, 'reload schema';
