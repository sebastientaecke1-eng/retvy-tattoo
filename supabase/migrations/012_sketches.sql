-- Croquis & validation client (Section 5)

CREATE TABLE IF NOT EXISTS public.bookings_sketches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pro_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_email text NOT NULL,
  sketch_url text,
  storage_path text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'approved', 'revision_requested')),
  client_comment text,
  validation_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_sketches_pro
  ON public.bookings_sketches(pro_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_sketches_token
  ON public.bookings_sketches(validation_token);

ALTER TABLE public.bookings_sketches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_sketches owner read" ON public.bookings_sketches;
CREATE POLICY "bookings_sketches owner read"
  ON public.bookings_sketches FOR SELECT
  TO authenticated
  USING (auth.uid() = pro_user_id);

DROP POLICY IF EXISTS "bookings_sketches owner write" ON public.bookings_sketches;
CREATE POLICY "bookings_sketches owner write"
  ON public.bookings_sketches FOR ALL
  TO authenticated
  USING (auth.uid() = pro_user_id)
  WITH CHECK (auth.uid() = pro_user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('croquis', 'croquis', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "public read croquis" ON storage.objects';
  EXECUTE $p$CREATE POLICY "public read croquis" ON storage.objects
    FOR SELECT USING (bucket_id = 'croquis')$p$;

  EXECUTE 'DROP POLICY IF EXISTS "owner upload croquis" ON storage.objects';
  EXECUTE $p$CREATE POLICY "owner upload croquis" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'croquis'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  EXECUTE 'DROP POLICY IF EXISTS "owner delete croquis" ON storage.objects';
  EXECUTE $p$CREATE POLICY "owner delete croquis" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'croquis'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
END $$;
