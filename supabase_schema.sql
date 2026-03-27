-- ============================================================
--  Passwala — Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Users table (mirrors Firebase Auth + extra app metadata)
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  uid           TEXT          NOT NULL UNIQUE,   -- Firebase UID
  email         TEXT,
  display_name  TEXT,
  photo_url     TEXT,
  phone_number  TEXT,
  auth_provider TEXT          NOT NULL CHECK (auth_provider IN ('google', 'phone')),
  role          TEXT          NOT NULL DEFAULT 'customer'
                                CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-update "updated_at" timestamp on row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) — enabled but backend uses service_role key (bypasses RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow the authenticated user to read their own row (for direct frontend access)
CREATE POLICY "Users can read own row"
  ON public.users FOR SELECT
  USING (auth.uid()::text = uid);

-- Allow the authenticated user to update their own row
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = uid);
