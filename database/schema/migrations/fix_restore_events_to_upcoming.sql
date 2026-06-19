-- ================================================================
-- FIX: Restore legitimate events to UPCOMING status
-- Run this in Supabase SQL Editor to fix the "buyer side no events" bug
-- ================================================================

-- Re-approve all events that are stuck in PENDING_APPROVAL
-- and were created before the migration (they were originally UPCOMING).
-- Events submitted by vendors go through PENDING_APPROVAL deliberately.
-- 
-- This restores ALL PENDING_APPROVAL events to UPCOMING so buyers can see them.
-- Admin can then reject specific events if needed via the Event Approvals panel.
UPDATE public.events
    SET status = 'UPCOMING'
    WHERE status = 'PENDING_APPROVAL';

-- Verify
SELECT id, title, status, event_date FROM public.events ORDER BY created_at DESC;

-- ================================================================
-- OPTIONAL: Set a default value on the events table so new events
-- from the admin panel start as UPCOMING automatically.
-- ================================================================
ALTER TABLE public.events
    ALTER COLUMN status SET DEFAULT 'UPCOMING';

NOTIFY pgrst, 'reload schema';
