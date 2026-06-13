-- ================================================================
-- MIGRATION: Add PENDING_APPROVAL and REJECTED to events.status
-- ⚠️  Run this ONCE in Supabase SQL Editor
-- ================================================================

-- Step 1: Drop old CHECK constraint
ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS events_status_check;

-- Step 2: Add new constraint with all statuses including PENDING_APPROVAL
ALTER TABLE public.events
    ADD CONSTRAINT events_status_check
    CHECK (status IN (
        'UPCOMING',
        'ONGOING',
        'COMPLETED',
        'CANCELLED',
        'SOLD_OUT',
        'PENDING_APPROVAL',
        'REJECTED'
    ));

-- Step 3: Move all existing UPCOMING events to PENDING_APPROVAL
-- so they require admin approval before showing to buyers.
UPDATE public.events
    SET status = 'PENDING_APPROVAL'
    WHERE status = 'UPCOMING';

NOTIFY pgrst, 'reload schema';

-- ✅ Done.
-- After running this:
--   • All events go to PENDING_APPROVAL by default
--   • Admin approves → status = UPCOMING → visible to buyers
--   • Admin rejects → status = REJECTED → hidden from buyers
