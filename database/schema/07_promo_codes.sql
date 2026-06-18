-- ================================================================
-- PASSWALA — 07: PROMO CODES + REDEMPTIONS
-- ================================================================
-- Tables:
--   promo_codes       → Admin-created discount codes
--   promo_redemptions → Per-user usage tracking (prevents reuse abuse)
--
-- Types:
--   flat    → fixed ₹ discount (e.g. ₹50 off)
--   percent → percentage discount (e.g. 10% off, capped at max_discount)
--
-- RPC:
--   increment_promo_usage(p_code) → safely increments used_count
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ================================================================


-- ================================================================
-- TABLE: promo_codes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(30)  UNIQUE NOT NULL,           -- e.g. SAVE50, FLAT10P
    type           VARCHAR(10)  NOT NULL
                   CHECK (type IN ('flat', 'percent')),
    value          FLOAT        NOT NULL,                  -- ₹ amount OR % number
    min_order      FLOAT        DEFAULT 0,                 -- Min cart value required
    max_discount   FLOAT        DEFAULT NULL,              -- Cap for percent type (NULL = no cap)
    max_uses       INTEGER      DEFAULT NULL,              -- NULL = unlimited global uses
    per_user_limit INTEGER      DEFAULT 1,                 -- Max times one user can use it
    used_count     INTEGER      DEFAULT 0,
    expires_at     TIMESTAMP WITH TIME ZONE DEFAULT NULL,  -- NULL = no expiry
    is_active      BOOLEAN      DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add per_user_limit if upgrading existing DB
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS per_user_limit INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_promo_codes_code      ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);

-- ================================================================
-- RPC: increment_promo_usage
-- Called server-side when an order is confirmed with a promo code
-- ================================================================
CREATE OR REPLACE FUNCTION increment_promo_usage(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- TABLE: promo_redemptions
-- Per-user promo usage log — prevents a user from reusing a code
-- ================================================================
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
    id          UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    promo_code  TEXT     NOT NULL,
    order_id    UUID     REFERENCES public.orders(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UNIQUE: one record per user per code (enforces per_user_limit = 1 default)
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_user_code
    ON public.promo_redemptions(user_id, promo_code);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON public.promo_redemptions(promo_code);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.promo_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_all"       ON public.promo_codes;
DROP POLICY IF EXISTS "promo_redemptions_all" ON public.promo_redemptions;

CREATE POLICY "promo_codes_all"
    ON public.promo_codes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "promo_redemptions_all"
    ON public.promo_redemptions FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 07_promo_codes.sql
