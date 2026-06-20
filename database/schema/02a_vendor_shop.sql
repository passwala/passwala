-- ================================================================
-- PASSWALA — 02a: VENDOR SIDE — SHOP (Retail / Product Store)
-- ================================================================
-- Tables:
--   vendors            → Shop vendor account (KYC, business info)
--   stores             → Public storefront linked to vendor
--   product_categories → Categories scoped to a store
--   products           → Products listed in a store
--   inventory          → Stock tracking per product
--   deals              → Store-level promotional deals
--
-- Triggers:
--   trigger_decrement_stock → Auto-decrement stock on order_item INSERT
--   trigger_restore_stock   → Auto-restore stock when order CANCELLED
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================


-- ================================================================
-- TABLE: vendors
-- ================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone             VARCHAR(20)  UNIQUE NOT NULL,
    name              VARCHAR(255),
    business_name     VARCHAR(255),
    address           TEXT,
    license_no        VARCHAR(100),
    category          VARCHAR(100),
    aadhar_no         VARCHAR(20),
    is_verified       BOOLEAN      DEFAULT FALSE,
    profile_completed BOOLEAN      DEFAULT FALSE,
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON public.vendors;
CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_vendors_phone   ON public.vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);


-- ================================================================
-- TABLE: stores
-- Public-facing storefront buyers browse
-- ================================================================
CREATE TABLE IF NOT EXISTS public.stores (
    id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id          UUID         REFERENCES public.vendors(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name               VARCHAR(255) NOT NULL,
    description        TEXT,
    logo_url           TEXT,
    banner_url         TEXT,
    address            TEXT,
    phone              VARCHAR(20),                    -- Store contact number
    gstin              VARCHAR(20),                    -- GST registration number
    lat                DECIMAL(10,8),
    lng                DECIMAL(11,8),
    is_open            BOOLEAN      DEFAULT TRUE,
    rating             DECIMAL(3,2) DEFAULT 0.0,
    booking_open_time  TIME,
    booking_close_time TIME,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_vendor_id ON public.stores(vendor_id);

-- Add FK back to carts and orders now that stores is created
ALTER TABLE public.carts  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Grant public read on stores
GRANT SELECT ON public.stores TO anon, authenticated;


-- ================================================================
-- TABLE: product_categories
-- ================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id   UUID         REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (store_id, name)
);


-- ================================================================
-- TABLE: products
-- ================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id       UUID          REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    category_id    UUID          REFERENCES public.product_categories(id) ON DELETE SET NULL,
    name           VARCHAR(255)  NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    image_url      TEXT,
    barcode        TEXT,
    barcode_type   VARCHAR(50)   DEFAULT 'EAN-13',  -- EAN-13 | UPC-A | EAN-8
    stock_quantity INT           DEFAULT 0,
    is_active      BOOLEAN       DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_store_id    ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- Prevent stock going below 0
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_non_negative') THEN
    ALTER TABLE public.products ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- Add FK to order_items now that products exists
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Grant public read on products
GRANT SELECT ON public.products TO anon, authenticated;


-- ================================================================
-- TABLE: inventory
-- ================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stock_count INT  DEFAULT 0,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ================================================================
-- TABLE: deals
-- ================================================================
CREATE TABLE IF NOT EXISTS public.deals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id            UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    title               VARCHAR(255) NOT NULL,
    discount_percentage INT,
    valid_until         TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ================================================================
-- STOCK CONTROL TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock_quantity = stock_quantity - COALESCE(NEW.quantity, 1)
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decrement_stock ON public.order_items;
CREATE TRIGGER trigger_decrement_stock
    AFTER INSERT ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_order();

CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    FOR item IN
        SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id
    LOOP
      IF item.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + COALESCE(item.quantity, 1)
        WHERE id = item.product_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restore_stock ON public.orders;
CREATE TRIGGER trigger_restore_stock
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.vendors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_all"            ON public.vendors;
DROP POLICY IF EXISTS "stores_all"             ON public.stores;
DROP POLICY IF EXISTS "product_categories_all" ON public.product_categories;
DROP POLICY IF EXISTS "products_all"           ON public.products;
DROP POLICY IF EXISTS "inventory_all"          ON public.inventory;
DROP POLICY IF EXISTS "deals_all"              ON public.deals;

CREATE POLICY "vendors_all"            ON public.vendors            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stores_all"             ON public.stores             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "product_categories_all" ON public.product_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "products_all"           ON public.products           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventory_all"          ON public.inventory          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "deals_all"              ON public.deals              FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- Enable Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'products'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'supabase_realtime not configured — skipping';
END $$;

-- ✅ Done: 02a_vendor_shop.sql
