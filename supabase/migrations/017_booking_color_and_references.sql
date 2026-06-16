-- Préférence couleur + bucket références booking

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS color_preference text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-references', 'booking-references', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "public read booking-references" ON storage.objects';
  EXECUTE $p$CREATE POLICY "public read booking-references" ON storage.objects
    FOR SELECT USING (bucket_id = 'booking-references')$p$;
END $$;
