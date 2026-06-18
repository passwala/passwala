-- ================================================================
-- PASSWALA — 08: ORDER RATINGS
-- ================================================================
-- Table:
--   order_ratings → Buyer submits 1-5 star rating after DELIVERED order
--
-- Rules:
--   - One rating per (order_id, user_id) pair — enforced by UNIQUE
--   - store_id denormalized for fast vendor-level avg rating queries
--   - Rating submitted via POST /api/orders/rate (server validates ownership)
--
-- ⚠️  Run AFTER 01_users_buyers.sql and 02a_vendor_shop.sql
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.order_ratings (
    id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id   UUID    REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id    UUID    REFERENCES public.users(id)  ON DELETE SET NULL,
    store_id   UUID    REFERENCES public.stores(id) ON DELETE SET NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (order_id, user_id)                         -- one rating per order per user
);

CREATE INDEX IF NOT EXISTS idx_order_ratings_order_id ON public.order_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_order_ratings_store_id ON public.order_ratings(store_id);
CREATE INDEX IF NOT EXISTS idx_order_ratings_user_id  ON public.order_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_order_ratings_rating   ON public.order_ratings(rating);

-- ================================================================
-- FUNCTION: auto-update store average rating after each new rating
-- ================================================================
CREATE OR REPLACE FUNCTION update_store_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    UPDATE public.stores
    SET rating = (
        SELECT ROUND(AVG(rating)::NUMERIC, 2)
        FROM public.order_ratings
        WHERE store_id = NEW.store_id
    )
    WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_store_rating ON public.order_ratings;
CREATE TRIGGER trg_update_store_rating
    AFTER INSERT OR UPDATE ON public.order_ratings
    FOR EACH ROW EXECUTE FUNCTION update_store_avg_rating();


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_ratings_all" ON public.order_ratings;

CREATE POLICY "order_ratings_all"
    ON public.order_ratings FOR ALL
    USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
-- ✅ Done: 08_order_ratings.sql
