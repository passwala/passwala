-- ================================================================
-- PASSWALA — 07: PROMO CODES
-- ================================================================
-- Table:
--   promo_codes → Admin-created discount codes redeemable at checkout
--
-- Types:
--   flat    → fixed ₹ discount (e.g. ₹50 off)
--   percent → percentage discount (e.g. 10% off, capped at max_discount)
--
-- ⚠️  Run AFTER 01_users_buyers.sql
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(30)   UNIQUE NOT NULL,          -- e.g. SAVE50, FLAT10P
    type           VARCHAR(10)   NOT NULL
                   CHECK (type IN ('flat', 'percent')),
    value          FLOAT         NOT NULL,                 -- ₹ amount OR % number
    min_order      FLOAT         DEFAULT 0,                -- min cart value required
    max_discount   FLOAT         DEFAULT NULL,             -- cap for percent type (NULL = no cap)
    max_uses       INTEGER       DEFAULT NULL,             -- NULL = unlimited
    used_count     INTEGER       DEFAULT 0,
    expires_at     TIMESTAMP WITH TIME ZONE DEFAULT NULL,  -- NULL = no expiry
    is_active      BOOLEAN       DEFAULT true,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code      ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_all" ON public.promo_codes;

-- Open policy — access control enforced in Express backend
CREATE POLICY "promo_codes_all"
    ON public.promo_codes FOR ALL
    USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 07_promo_codes.sql
