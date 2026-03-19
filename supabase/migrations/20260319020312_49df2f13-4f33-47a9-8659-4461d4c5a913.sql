-- Add validation method to user settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS punch_validation_method text NOT NULL DEFAULT 'none';

-- Add photo_url to clock_punches for face capture
ALTER TABLE public.clock_punches ADD COLUMN IF NOT EXISTS photo_url text DEFAULT NULL;

-- Create storage bucket for punch photos
INSERT INTO storage.buckets (id, name, public) VALUES ('punch-photos', 'punch-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for punch-photos bucket: users can upload their own photos
CREATE POLICY "Users can upload own punch photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'punch-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view own photos
CREATE POLICY "Users can view own punch photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'punch-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete own photos
CREATE POLICY "Users can delete own punch photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'punch-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Also allow public read for reference photos display
CREATE POLICY "Public read punch photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'punch-photos');