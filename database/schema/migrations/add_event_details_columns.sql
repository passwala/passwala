-- ================================================================
-- PASSWALA — MIGRATION: ADD DETAILS COLUMNS TO EVENTS
-- ================================================================

ALTER TABLE IF EXISTS public.events 
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
    ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(100),
    ADD COLUMN IF NOT EXISTS language VARCHAR(100);

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
