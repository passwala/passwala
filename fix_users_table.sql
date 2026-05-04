-- Run this in your Supabase SQL Editor to fix the schema mismatch
-- This adds the missing 'role' column to the 'users' table

-- 1. Add role column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'BUYER';

-- 2. Add role column to admins (just in case)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'ADMIN';

-- 3. Add uid column to users (for Firebase sync)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS uid TEXT;

-- 4. Ensure id is the primary key and auto-generates UUID
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';
