-- ================================================================
-- MIGRATION: Add missing columns to addresses table
-- Run this in Supabase SQL Editor → New Query → Run
-- ================================================================

-- Add 'name' label column (Home, Office, PG, etc.)
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Home';

-- Add 'society' locality column
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS society VARCHAR(255);

-- Backfill existing rows
UPDATE public.addresses
   SET name = 'Home'
 WHERE name IS NULL;

-- Force PostgREST to reload the schema cache immediately
NOTIFY pgrst, 'reload schema';
-- ✅ Done: addresses.name + addresses.society columns added
