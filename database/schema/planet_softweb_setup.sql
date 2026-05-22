-- Planet Softweb Database Migrations for Supabase PostgreSQL
-- ==============================================================

-- 1. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage INT NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    max_discount DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    seller_state VARCHAR(100) DEFAULT 'Gujarat',
    customer_state VARCHAR(100) NOT NULL,
    cgst DECIMAL(10,2) DEFAULT 0.00,
    sgst DECIMAL(10,2) DEFAULT 0.00,
    igst DECIMAL(10,2) DEFAULT 0.00,
    delivery_charges DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_tax DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    invoice_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'Razorpay',
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    amount DECIMAL(10,2) NOT NULL,
    refund_status VARCHAR(50) DEFAULT 'NONE',
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    raw_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Delivery Tracking Table
CREATE TABLE IF NOT EXISTS delivery_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    rider_id UUID,
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    status VARCHAR(50) DEFAULT 'PENDING',
    tracking_steps JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index optimization
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON delivery_tracking(order_id);

-- Add updated_at trigger for delivery_tracking
CREATE OR REPLACE FUNCTION update_delivery_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_delivery_tracking_updated_at ON delivery_tracking;
CREATE TRIGGER trg_update_delivery_tracking_updated_at
    BEFORE UPDATE ON delivery_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_tracking_updated_at();

-- RLS Configurations
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for authenticated and anon roles during development
CREATE POLICY "Allow public select on coupons" ON coupons FOR SELECT USING (true);
CREATE POLICY "Allow public all on coupons" ON coupons FOR ALL USING (true);

CREATE POLICY "Allow public all on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow public all on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow public all on delivery_tracking" ON delivery_tracking FOR ALL USING (true);

-- Populate default coupons for demo testing
INSERT INTO coupons (code, discount_percentage, max_discount, min_order_amount)
VALUES ('SOFTWEB20', 20, 500.00, 200.00)
ON CONFLICT (code) DO NOTHING;

INSERT INTO coupons (code, discount_percentage, max_discount, min_order_amount)
VALUES ('GSTFREE', 10, 200.00, 100.00)
ON CONFLICT (code) DO NOTHING;
