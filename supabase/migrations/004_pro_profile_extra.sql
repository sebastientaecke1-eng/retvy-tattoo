-- Colonnes profil public + portfolio + buckets Storage (idempotent)

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS price_min integer,
  ADD COLUMN IF NOT EXISTS price_max integer;

CREATE TABLE IF NOT EXISTS public.pro_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style text NOT NULL,
  image_url text NOT NULL,
  storage_path text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_portfolio_user_style
  ON public.pro_portfolio(user_id, style);

ALTER TABLE public.pro_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio public read" ON public.pro_portfolio;
CREATE POLICY "portfolio public read"
  ON public.pro_portfolio FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "portfolio owner insert" ON public.pro_portfolio;
CREATE POLICY "portfolio owner insert"
  ON public.pro_portfolio FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfolio owner delete" ON public.pro_portfolio;
CREATE POLICY "portfolio owner delete"
  ON public.pro_portfolio FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['avatars', 'portfolio'] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "public read %1$s" ON storage.objects',
      b
    );
    EXECUTE format(
      $p$CREATE POLICY "public read %1$s" ON storage.objects
        FOR SELECT USING (bucket_id = %1$L)$p$,
      b
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "owner upload %1$s" ON storage.objects',
      b
    );
    EXECUTE format(
      $p$CREATE POLICY "owner upload %1$s" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = %1$L
          AND auth.uid()::text = (storage.foldername(name))[1]
        )$p$,
      b
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "owner delete %1$s" ON storage.objects',
      b
    );
    EXECUTE format(
      $p$CREATE POLICY "owner delete %1$s" ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = %1$L
          AND auth.uid()::text = (storage.foldername(name))[1]
        )$p$,
      b
    );
  END LOOP;
END $$;
