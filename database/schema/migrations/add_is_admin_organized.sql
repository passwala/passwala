-- migration: add_is_admin_organized.sql
-- Run this in the Supabase SQL Editor:
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS is_admin_organized BOOLEAN DEFAULT FALSE;
