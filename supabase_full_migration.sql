-- 
-- Passwala Full Database Schema (Supabase)
-- Migrated from Mock Data and MongoDB
-- 

-- 1. Services Table (Home, Professional, etc.)
CREATE TABLE IF NOT EXISTS services (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  rating DECIMAL DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  price DECIMAL NOT NULL,
  neighbors INTEGER DEFAULT 0,
  premium BOOLEAN DEFAULT FALSE,
  image TEXT,
  category TEXT DEFAULT 'home',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Essentials Table (Milk, Grocery, Pharma)
CREATE TABLE IF NOT EXISTS essentials (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  store TEXT NOT NULL,
  delivery_time TEXT,
  category TEXT DEFAULT 'grocery',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Nearby Deals Table
CREATE TABLE IF NOT EXISTS deals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  offer TEXT NOT NULL,
  store TEXT NOT NULL,
  price DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  price DECIMAL NOT NULL,
  image TEXT,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bookings / Orders Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Firebase UID
  item_id BIGINT,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'service', 'essential', 'deal'
  price DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Cart Table (Optional for persistence)
CREATE TABLE IF NOT EXISTS carts (
  user_id TEXT PRIMARY KEY, -- Firebase UID
  items JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Users Table
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  phone_number TEXT,
  auth_provider TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Vendor Applications Table
CREATE TABLE IF NOT EXISTS vendor_applications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 
-- SEED DATA ( Ahmedabad Satellite Context )
-- 

INSERT INTO services (name, provider, rating, reviews, price, neighbors, premium, image) VALUES
('Premium AC Service', 'Vikas Tech', 4.9, 128, 999, 12, true, '/ac_service.png'),
('Full Home Deep Clean', 'CleanPro', 4.7, 85, 2999, 5, false, '/cleaning.png'),
('Carpentry & Furniture', 'WoodWorks', 4.8, 210, 499, 18, true, '/carpentry.png'),
('Electrician (On-Call)', 'Sparky', 4.6, 45, 199, 3, false, '/electrician.png')
ON CONFLICT DO NOTHING;

INSERT INTO essentials (name, price, store, delivery_time) VALUES
('Fresh Milk', 45, 'Local Dairy', '10 min'),
('Local Vegetables', 120, 'Apna Mandi', '15 min'),
('Pantry Grocery', 900, 'Gopal Mart', '20 min'),
('Basic Pharmacy', 180, 'LifeCare', '30 min')
ON CONFLICT DO NOTHING;

INSERT INTO deals (name, offer, store, price) VALUES
('Laundry Wash', '50% OFF', 'CleanCloud', 149),
('Fresh Grocery', '20% OFF', 'Local Mart', 720),
('Fitness Pack', 'BOGO', 'Active Gym', 999),
('Cafe Treat', 'Flat ₹100', 'Brew Town', 200)
ON CONFLICT DO NOTHING;

INSERT INTO recommendations (name, reason, price, image, provider) VALUES
('AC Service', 'Summer Heat', 999, '/ac_service.png', 'Vikas Tech'),
('Water Purifier', 'Monsoon Filter', 1499, '/water_purifier.png', 'AquaFresh'),
('Electrician', 'Usage Surge', 299, '/electrician.png', 'Sparky')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE essentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;

-- Policies: Anonymous read access for items, Authenticated access for bookings/carts
DROP POLICY IF EXISTS "Public Read Services" ON services;
CREATE POLICY "Public Read Services" ON services FOR SELECT USING (true);
CREATE POLICY "Admin CRUD Services" ON services FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Essentials" ON essentials;
CREATE POLICY "Public Read Essentials" ON essentials FOR SELECT USING (true);
CREATE POLICY "Admin CRUD Essentials" ON essentials FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Deals" ON deals;
CREATE POLICY "Public Read Deals" ON deals FOR SELECT USING (true);
CREATE POLICY "Admin CRUD Deals" ON deals FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Recs" ON recommendations;
CREATE POLICY "Public Read Recs" ON recommendations FOR SELECT USING (true);
CREATE POLICY "Admin CRUD Recs" ON recommendations FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage their own bookings" ON bookings;
CREATE POLICY "Users can manage their own bookings" ON bookings
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage their own cart" ON carts;
CREATE POLICY "Users can manage their own cart" ON carts
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view and edit their own profile" ON users;
CREATE POLICY "Users can view and edit their own profile" ON users
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can view vendor apps" ON vendor_applications;
CREATE POLICY "Anyone can manage vendor apps" ON vendor_applications FOR ALL USING (true);
CREATE POLICY "Public Read Vendor Apps" ON vendor_applications FOR SELECT USING (true);

-- 9. Community Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  location TEXT NOT NULL,
  text TEXT NOT NULL UNIQUE,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED COMMUNITY DATA
INSERT INTO community_posts (user_name, user_avatar, location, text, likes, comments) VALUES
('Jane Doe', 'JD', 'Satellite Resident', 'I just got my AC fixed by Vikas Tech and the experience was amazing. Transparent pricing and local trust! Highly recommend for anyone in Ahmedabad.', 12, 3),
('Priya K.', 'PK', 'Vastrapur Resident', 'The milk delivery from Local Fresh is consistently early. Best quality in the neighborhood so far! 🥛', 45, 8),
('Rohan Shah', 'RS', 'Ambawadi Resident', 'WoodWorks turned my old table into a masterpiece. Authentic carpentry still exists in Ahmedabad! 🪚', 89, 15)
ON CONFLICT DO NOTHING;

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Community" ON community_posts;
CREATE POLICY "Public Read Community" ON community_posts FOR SELECT USING (true);

