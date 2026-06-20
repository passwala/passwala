-- ================================================================
-- PASSWALA — MIGRATION: ADD SHOW_TYPE TO EVENTS
-- ================================================================

ALTER TABLE IF EXISTS public.events 
    ADD COLUMN IF NOT EXISTS show_type VARCHAR(20) DEFAULT 'single' 
    CHECK (show_type IN ('single', 'multiple', 'tour'));

CREATE INDEX IF NOT EXISTS idx_events_show_type ON public.events(show_type);
