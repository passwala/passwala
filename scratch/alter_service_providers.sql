-- Run this SQL script in your Supabase Dashboard's SQL Editor to fix the Service Provider table schema
-- This will add the missing columns to the service_providers table so that registrations succeed and appear on the Admin side!

ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS name VARCHAR(100),
ADD COLUMN IF NOT EXISTS aadhar_no VARCHAR(20),
ADD COLUMN IF NOT EXISTS license_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Optional: Enable Row Level Security policies if not already enabled
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- Allow public read of service providers (or as needed)
CREATE POLICY "Allow public read-only access for service_providers" ON service_providers
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update their own service provider records
CREATE POLICY "Allow users to insert service_provider profile" ON service_providers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update service_provider profile" ON service_providers
    FOR UPDATE USING (auth.uid() = user_id);

-- Verify the new table columns by running:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_providers';
