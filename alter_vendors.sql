-- Run this directly in the Supabase SQL Editor to add the missing onboarding fields to the vendors table

ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS name VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS aadhar_no VARCHAR(20),
ADD COLUMN IF NOT EXISTS license_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS second_image_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Automatically reload the PostgREST schema cache so your front-end will immediately recognize the new columns
NOTIFY pgrst, 'reload schema';
