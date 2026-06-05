-- Photos du studio (page publique /ink + dashboard profil)

CREATE TABLE IF NOT EXISTS public.pro_studio_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_studio_photos_user
  ON public.pro_studio_photos(user_id, position);

ALTER TABLE public.pro_studio_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio photos public read" ON public.pro_studio_photos;
CREATE POLICY "studio photos public read"
  ON public.pro_studio_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "studio photos owner write" ON public.pro_studio_photos;
CREATE POLICY "studio photos owner write"
  ON public.pro_studio_photos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-photos', 'studio-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "public read studio-photos" ON storage.objects';
  EXECUTE $p$CREATE POLICY "public read studio-photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'studio-photos')$p$;
  EXECUTE 'DROP POLICY IF EXISTS "owner upload studio-photos" ON storage.objects';
  EXECUTE $p$CREATE POLICY "owner upload studio-photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'studio-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
  EXECUTE 'DROP POLICY IF EXISTS "owner delete studio-photos" ON storage.objects';
  EXECUTE $p$CREATE POLICY "owner delete studio-photos" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'studio-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
END $$;
