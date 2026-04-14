-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create a temporary "Development Mode" policy for all tables
-- This allows your React app to freely read/write data while you are building it.
-- (We will lock this down with strict security rules before you launch on the Play Store).

CREATE POLICY "Dev Mode Allow All" ON users FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON addresses FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON service_categories FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON service_providers FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON services FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON service_bookings FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON vendors FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON stores FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON product_categories FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON products FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON inventory FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON cart FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON orders FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON order_items FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON riders FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON rider_locations FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON rider_earnings FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON posts FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON comments FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON notifications FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON deals FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON ai_recommendations FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON admins FOR ALL USING (true);
CREATE POLICY "Dev Mode Allow All" ON reports FOR ALL USING (true);
