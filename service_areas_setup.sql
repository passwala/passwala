-- ==============================================
-- 11. LOCATION MANAGEMENT
-- ==============================================

-- Create the service_areas table to manage Ahmedabad neighborhoods
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(100) DEFAULT 'Ahmedabad',
    area_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default areas for testing
INSERT INTO service_areas (area_name, is_active) VALUES 
('Satellite', true),
('Bopal', true),
('Prahlad Nagar', true),
('Sindhu Bhavan', true),
('Gota', false),
('Science City', false);

-- Enable Row Level Security
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- 1. Allow everyone to read active service areas (for Rider/User apps)
CREATE POLICY "Allow public read-only access" ON service_areas
    FOR SELECT USING (is_active = true);

-- 2. Allow admin-level access (for the Admin Panel)
-- Note: Since the Admin Panel uses the Service Role via the backend, it will bypass this anyway.
-- But for direct dashboard access, we allow all for now.
CREATE POLICY "Allow all for authenticated admins" ON service_areas
    FOR ALL USING (auth.role() = 'authenticated');

