-- ================================================================
-- PASSWALA — MIGRATION: ENABLE RLS ON EVENTS & TICKETING TABLES
-- ================================================================

ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_organizer_requests ENABLE ROW LEVEL SECURITY;
