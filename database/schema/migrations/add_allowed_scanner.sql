-- migration: add_allowed_scanner.sql
-- Run this in the Supabase SQL Editor:
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS allowed_scanner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
