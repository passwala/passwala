-- ================================================================
-- PASSWALA — 02a: VENDOR SIDE — SHOP (Retail / Product Store)
-- ================================================================
-- Tables:
--   vendors            → Shop vendor account (KYC, business info)
--   stores             → The public storefront linked to vendor
--   product_categories → Categories scoped to a store
--   products           → Products listed in a store
--   inventory          → Stock tracking per product
--   deals              → Store-level promotional deals/discounts
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: vendors
-- Shop owner's business account (KYC + profile info)
-- ================================================================
CREATE TABLE IF NOT EXISTS vendors (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone             VARCHAR(20)  UNIQUE NOT NULL,   -- 10-digit, no +91
    name              VARCHAR(255),                   -- Owner name
    business_name     VARCHAR(255),                   -- Shop / brand name
    address           TEXT,                           -- Shop address
    license_no        VARCHAR(100),                   -- FSSAI / Trade license
    category          VARCHAR(100),                   -- e.g. 'Grocery & Essentials'
    aadhar_no         VARCHAR(20),                    -- KYC (masked)
    is_verified       BOOLEAN      DEFAULT FALSE,     -- Admin approved
    profile_completed BOOLEAN      DEFAULT FALSE,
    lat               DOUBLE PRECISION,               -- Shop map pin
    lng               DOUBLE PRECISION,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_vendors_phone   ON vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);


-- ================================================================
-- TABLE: stores
-- The public-facing storefront that buyers browse
-- ================================================================
CREATE TABLE IF NOT EXISTS stores (
    id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id          UUID         REFERENCES vendors(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name               VARCHAR(255) NOT NULL,
    description        TEXT,
    logo_url           TEXT,
    banner_url         TEXT,
    address            TEXT,
    lat                DECIMAL(10,8),
    lng                DECIMAL(11,8),
    is_open            BOOLEAN      DEFAULT TRUE,       -- Open/closed toggle
    rating             DECIMAL(3,2) DEFAULT 0.0,
    booking_open_time  TIME,                            -- Store open window e.g. '09:00:00'
    booking_close_time TIME,                            -- Store close window e.g. '21:00:00'
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_vendor_id ON stores(vendor_id);


-- ================================================================
-- TABLE: product_categories
-- Product categories scoped to a specific store
-- ================================================================
CREATE TABLE IF NOT EXISTS product_categories (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id   UUID         REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (store_id, name)
);


-- ================================================================
-- TABLE: products
-- Products listed by a store. Stock decremented on each order.
-- ================================================================
CREATE TABLE IF NOT EXISTS products (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id       UUID          REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    category_id    UUID          REFERENCES product_categories(id) ON DELETE SET NULL,
    name           VARCHAR(255)  NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),                    -- Optional sale price
    image_url      TEXT,
    barcode        TEXT,
    barcode_type   VARCHAR(50)   DEFAULT 'EAN-13',   -- EAN-13 | UPC-A | EAN-8
    stock_quantity INT           DEFAULT 0,           -- Auto-decremented on order
    is_active      BOOLEAN       DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_store_id    ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Prevent stock going below 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_non_negative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);
  END IF;
END $$;


-- ================================================================
-- TABLE: inventory
-- Separate stock tracking table (mirrors products.stock_quantity)
-- ================================================================
CREATE TABLE IF NOT EXISTS inventory (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stock_count INT  DEFAULT 0,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ================================================================
-- TABLE: deals
-- Store-level promotional deals and discounts
-- ================================================================
CREATE TABLE IF NOT EXISTS deals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id            UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    title               VARCHAR(255) NOT NULL,
    discount_percentage INT,
    valid_until         TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ================================================================
-- STOCK CONTROL TRIGGERS
-- Auto-decrement stock when an order_item is inserted
-- Auto-restore stock when an order is cancelled
-- ================================================================
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET stock_quantity = stock_quantity - COALESCE(NEW.quantity, 1)
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decrement_stock ON order_items;
CREATE TRIGGER trigger_decrement_stock
    AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_order();

CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    FOR item IN
        SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id
    LOOP
      IF item.product_id IS NOT NULL THEN
        UPDATE products
        SET stock_quantity = stock_quantity + COALESCE(item.quantity, 1)
        WHERE id = item.product_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restore_stock ON orders;
CREATE TRIGGER trigger_restore_stock
    AFTER UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE vendors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_all"            ON vendors;
DROP POLICY IF EXISTS "stores_all"             ON stores;
DROP POLICY IF EXISTS "product_categories_all" ON product_categories;
DROP POLICY IF EXISTS "products_all"           ON products;
DROP POLICY IF EXISTS "inventory_all"          ON inventory;
DROP POLICY IF EXISTS "deals_all"              ON deals;

CREATE POLICY "vendors_all"            ON vendors            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stores_all"             ON stores             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "product_categories_all" ON product_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "products_all"           ON products           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventory_all"          ON inventory          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "deals_all"              ON deals              FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 02a_vendor_shop.sql
