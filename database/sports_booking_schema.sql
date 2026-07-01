-- ------------------------------------------------------------
-- PASSWALA — Sports Venue Booking Schema
-- Run this SQL in your Supabase SQL Editor
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sports_venues (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  sport_types         TEXT[] NOT NULL DEFAULT '{}',
  address             TEXT,
  city                TEXT DEFAULT 'Ahmedabad',
  lat                 FLOAT,
  lng                 FLOAT,
  owner_id            UUID,
  owner_user_id       UUID,
  owner_name          TEXT,
  owner_phone         TEXT,
  price_per_hour      JSONB DEFAULT '{}',
  images              TEXT[] DEFAULT '{}',
  amenities           TEXT[] DEFAULT '{}',
  open_time           TIME DEFAULT '06:00:00',
  close_time          TIME DEFAULT '22:00:00',
  slot_duration_mins  INT DEFAULT 60,
  max_players         JSONB DEFAULT '{}',
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  rejection_reason    TEXT,
  total_bookings      INT DEFAULT 0,
  rating              FLOAT DEFAULT 0,
  rating_count        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.venue_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        UUID NOT NULL REFERENCES public.sports_venues(id) ON DELETE CASCADE,
  sport_type      TEXT NOT NULL,
  slot_date       DATE NOT NULL,
  slot_time       TIME NOT NULL,
  slot_end_time   TIME NOT NULL,
  price           INT NOT NULL DEFAULT 0,
  status          TEXT DEFAULT 'available' CHECK (status IN ('available','booked','blocked')),
  booked_by       UUID,
  booking_id      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (venue_id, sport_type, slot_date, slot_time)
);

CREATE TABLE IF NOT EXISTS public.venue_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        UUID NOT NULL,
  slot_id         UUID REFERENCES public.venue_slots(id),
  user_id         UUID,
  user_phone      TEXT,
  user_name       TEXT,
  user_email      TEXT,
  sport_type      TEXT NOT NULL,
  slot_date       DATE NOT NULL,
  slot_time       TIME NOT NULL,
  slot_end_time   TIME,
  duration_mins   INT DEFAULT 60,
  base_amount     INT DEFAULT 0,
  platform_fee    INT DEFAULT 0,
  gst_amount      INT DEFAULT 0,
  total_amount    INT DEFAULT 0,
  status          TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  qr_code         TEXT UNIQUE,
  invoice_number  TEXT UNIQUE,
  payment_method  TEXT DEFAULT 'online',
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  checked_in_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sports_venues_owner ON public.sports_venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_sports_venues_status ON public.sports_venues(status);
CREATE INDEX IF NOT EXISTS idx_venue_slots_venue ON public.venue_slots(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_slots_date ON public.venue_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue ON public.venue_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_qr ON public.venue_bookings(qr_code);
