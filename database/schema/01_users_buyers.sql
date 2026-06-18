-- ================================================================
-- PASSWALA — 01: USERS & BUYERS
-- ================================================================
-- Tables:
--   users              → All platform users (role-based)
--   buyers_view        → View: only BUYER accounts
--   service_areas      → Ahmedabad delivery zones
--   addresses          → Saved delivery addresses per buyer
--   wallet_transactions→ Wallet credit / debit history
--   notifications      → In-app push notifications
--   carts              → Buyer shopping cart (JSONB items)
--   orders             → Placed orders
--   order_items        → Line items in each order
--   invoices           → GST invoice per order
--   payments           → Razorpay payment records
--   chat_threads       → Buyer ↔ Vendor chat rooms
--   chats              → Chat sessions
--   chat_messages      → Individual messages
--   posts              → Community posts
--   ai_recommendations → AI product suggestions per user
--   reports            → Admin deletion / dispute reports
--
-- ⚠️  Run this FIRST before all other schema files.
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- SHARED TRIGGER — auto-update updated_at on any table
-- ================================================================
CREATE OR REPLACE FUNCTION refresh_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- TABLE: users
-- role: BUYER | VENDOR | SERVICE_PROVIDER | RIDER | ADMIN
-- ================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone          VARCHAR(20)   UNIQUE NOT NULL,
    full_name      VARCHAR(100),
    email          VARCHAR(255),
    photo_url      TEXT,
    role           VARCHAR(50)   NOT NULL DEFAULT 'BUYER',
    uid            VARCHAR(255)  UNIQUE,               -- Firebase UID
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    fcm_token      TEXT,                               -- Push notification token
    is_suspended   BOOLEAN       DEFAULT FALSE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_uid   ON public.users(uid);
CREATE INDEX IF NOT EXISTS idx_users_role  ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- VIEW: only buyer accounts
CREATE OR REPLACE VIEW public.buyers_view
WITH (security_invoker = true) AS
    SELECT id, phone, full_name, email, photo_url, uid,
           wallet_balance, fcm_token, created_at, updated_at
    FROM public.users WHERE role = 'BUYER';


-- ================================================================
-- TABLE: service_areas
-- ================================================================
CREATE TABLE IF NOT EXISTS public.service_areas (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    city       VARCHAR(100) DEFAULT 'Ahmedabad',
    area_name  VARCHAR(100) UNIQUE NOT NULL,
    is_active  BOOLEAN      DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.service_areas (area_name, is_active) VALUES
    ('Satellite',       TRUE),
    ('Bopal',           TRUE),
    ('Prahlad Nagar',   TRUE),
    ('Sindhu Bhavan',   TRUE),
    ('Navrangpura',     TRUE),
    ('Thaltej',         TRUE),
    ('SG Highway',      TRUE),
    ('Vastrapur',       TRUE),
    ('Bodakdev',        TRUE),
    ('Gota',            FALSE),
    ('Science City',    FALSE),
    ('Motera',          FALSE),
    ('Chandkheda',      FALSE)
ON CONFLICT (area_name) DO NOTHING;


-- ================================================================
-- TABLE: addresses
-- ================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID         REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    address_line_1 TEXT         NOT NULL,
    address_line_2 TEXT,
    city           VARCHAR(100),
    state          VARCHAR(100),
    pincode        VARCHAR(10),
    society        VARCHAR(255),                       -- Parsed locality name
    lat            DECIMAL(10,8),
    lng            DECIMAL(11,8),
    is_default     BOOLEAN      DEFAULT FALSE,
    name           VARCHAR(255),                       -- Address label (Home, Office…)
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);


-- ================================================================
-- TABLE: wallet_transactions
-- ================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID          REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title       VARCHAR(255)  NOT NULL,
    description TEXT,
    amount      DECIMAL(10,2) NOT NULL,
    type        VARCHAR(50)   DEFAULT 'CREDIT',     -- CREDIT | DEBIT
    status      VARCHAR(50)   DEFAULT 'COMPLETED',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.wallet_transactions(user_id);


-- ================================================================
-- TABLE: notifications
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID         REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    data       JSONB        DEFAULT '{}'::jsonb,
    is_read    BOOLEAN      DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread  ON public.notifications(user_id, is_read) WHERE is_read = FALSE;


-- ================================================================
-- TABLE: carts
-- ================================================================
CREATE TABLE IF NOT EXISTS public.carts (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID  REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    store_id   UUID,                              -- FK added after stores table
    items      JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ================================================================
-- TABLE: orders
-- status: PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED
-- ================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID          REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id            UUID,                         -- FK added after stores table
    address_id          UUID          REFERENCES public.addresses(id) ON DELETE SET NULL,
    status              VARCHAR(50)   DEFAULT 'PLACED'
                        CHECK (status IN (
                            'PLACED','CONFIRMED','PREPARING',
                            'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','COMPLETED'
                        )),
    subtotal            DECIMAL(10,2) NOT NULL,
    delivery_fee        DECIMAL(10,2) DEFAULT 0.00,
    discount_amount     DECIMAL(10,2) DEFAULT 0.00,    -- Promo code discount applied
    promo_code          VARCHAR(30),                   -- Promo code used
    total_amount        DECIMAL(10,2) NOT NULL,
    payment_status      VARCHAR(50)   DEFAULT 'PENDING',  -- PENDING | PAID | FAILED
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    order_type          VARCHAR(50)   DEFAULT 'SHOP',  -- SHOP | SERVICE
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_orders_user_id  ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON public.orders(status);


-- ================================================================
-- TABLE: order_items
-- ================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id          UUID          REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id        UUID,                           -- FK added after products table
    quantity          INT           NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);


-- ================================================================
-- TABLE: invoices
-- ================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id         UUID          REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    invoice_number   VARCHAR(100)  UNIQUE NOT NULL,
    seller_state     VARCHAR(100)  DEFAULT 'Gujarat',
    customer_state   VARCHAR(100)  NOT NULL,
    cgst             DECIMAL(10,2) DEFAULT 0.00,
    sgst             DECIMAL(10,2) DEFAULT 0.00,
    igst             DECIMAL(10,2) DEFAULT 0.00,
    delivery_charges DECIMAL(10,2) DEFAULT 0.00,
    discount         DECIMAL(10,2) DEFAULT 0.00,
    total_tax        DECIMAL(10,2) DEFAULT 0.00,
    final_amount     DECIMAL(10,2) NOT NULL,
    invoice_pdf_url  TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);


-- ================================================================
-- TABLE: payments
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID          REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id   VARCHAR(100),
    payment_method      VARCHAR(50)   DEFAULT 'Razorpay',
    payment_status      VARCHAR(50)   DEFAULT 'PENDING',
    amount              DECIMAL(10,2) NOT NULL,
    refund_status       VARCHAR(50)   DEFAULT 'NONE',
    refund_amount       DECIMAL(10,2) DEFAULT 0.00,
    raw_details         JSONB         DEFAULT '{}'::jsonb,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);


-- ================================================================
-- TABLES: chats + chat_messages
-- ================================================================
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID          REFERENCES public.users(id) ON DELETE CASCADE,
    vendor_id    UUID          NOT NULL,
    vendor_name  VARCHAR(255)  NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category     VARCHAR(100),
    price        DECIMAL(10,2),
    provider_id  UUID,
    last_message TEXT,
    timestamp    VARCHAR(50),
    messages     JSONB         DEFAULT '[]'::jsonb,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS public.chats (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID          REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    vendor_id    UUID          NOT NULL,
    vendor_name  VARCHAR(255)  NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category     VARCHAR(100),
    price        DECIMAL(10,2),
    provider_id  UUID,
    last_message TEXT,
    timestamp    VARCHAR(50),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id    UUID        REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender     VARCHAR(50) NOT NULL,
    text       TEXT        NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id         ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);


-- ================================================================
-- TABLE: posts (Community)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id          UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID     REFERENCES public.users(id) ON DELETE CASCADE,
    content     TEXT     NOT NULL,
    image_url   TEXT,
    likes_count INTEGER  DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);


-- ================================================================
-- TABLE: reports
-- ================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    target_type VARCHAR(50)  NOT NULL,  -- ACCOUNT_DELETION | ORDER_DISPUTE | VENDOR_REPORT
    target_id   UUID,
    reason      TEXT,
    status      VARCHAR(50)  DEFAULT 'PENDING',  -- PENDING | COMPLETED | PENDING_DELETION
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_target_type ON public.reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON public.reports(status);


-- ================================================================
-- TABLE: ai_recommendations
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID  REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    data       JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_rec_user_id ON public.ai_recommendations(user_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_all"               ON public.users;
DROP POLICY IF EXISTS "service_areas_all"       ON public.service_areas;
DROP POLICY IF EXISTS "addresses_all"           ON public.addresses;
DROP POLICY IF EXISTS "wallet_transactions_all" ON public.wallet_transactions;
DROP POLICY IF EXISTS "notifications_all"       ON public.notifications;
DROP POLICY IF EXISTS "carts_all"               ON public.carts;
DROP POLICY IF EXISTS "orders_all"              ON public.orders;
DROP POLICY IF EXISTS "order_items_all"         ON public.order_items;
DROP POLICY IF EXISTS "invoices_all"            ON public.invoices;
DROP POLICY IF EXISTS "payments_all"            ON public.payments;
DROP POLICY IF EXISTS "chat_threads_all"        ON public.chat_threads;
DROP POLICY IF EXISTS "chats_all"               ON public.chats;
DROP POLICY IF EXISTS "chat_messages_all"       ON public.chat_messages;
DROP POLICY IF EXISTS "posts_all"               ON public.posts;
DROP POLICY IF EXISTS "reports_all"             ON public.reports;
DROP POLICY IF EXISTS "ai_recommendations_all"  ON public.ai_recommendations;

CREATE POLICY "users_all"               ON public.users               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_areas_all"       ON public.service_areas       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "addresses_all"           ON public.addresses           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "wallet_transactions_all" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notifications_all"       ON public.notifications       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "carts_all"               ON public.carts               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "orders_all"              ON public.orders              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "order_items_all"         ON public.order_items         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "invoices_all"            ON public.invoices            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "payments_all"            ON public.payments            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chat_threads_all"        ON public.chat_threads        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chats_all"               ON public.chats               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_all"       ON public.chat_messages       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "posts_all"               ON public.posts               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "reports_all"             ON public.reports             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ai_recommendations_all"  ON public.ai_recommendations  FOR ALL USING (true) WITH CHECK (true);

-- Grant anon / authenticated read on public data
GRANT SELECT ON public.users         TO anon, authenticated;
GRANT SELECT ON public.addresses     TO anon, authenticated;
GRANT SELECT ON public.service_areas TO anon, authenticated;

-- Enable Realtime on notifications + orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'supabase_realtime not configured — skipping';
END $$;

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 01_users_buyers.sql
