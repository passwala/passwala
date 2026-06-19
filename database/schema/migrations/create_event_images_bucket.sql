-- ═══════════════════════════════════════════════════════════════════════════
-- Create Supabase Storage bucket for event images
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create the bucket (public so images are accessible via public URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,                          -- public bucket (no signed URLs needed)
  10485760,                      -- 10 MB max per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

-- 2. Allow authenticated users (vendors) to upload to the bucket
CREATE POLICY "Vendors can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

-- 3. Allow public read access (so event images show without auth)
CREATE POLICY "Public read event images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-images');

-- 4. Allow vendors to delete their own images
CREATE POLICY "Vendors can delete their event images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Also allow anon uploads (for vendor portal without Supabase auth)
CREATE POLICY "Anon can upload event images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'event-images');
