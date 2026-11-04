-- Consentement électronique tatouage (signé en fin de réservation IA)

CREATE TABLE IF NOT EXISTS public.booking_consents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email     text        NOT NULL,
  signer_name      text        NOT NULL,
  signature        text        NOT NULL,            -- base64 PNG du tracé
  signed_at        timestamptz NOT NULL DEFAULT now(),
  booking_id       uuid        REFERENCES public.bookings(id) ON DELETE SET NULL,
  pro_slug         text,                            -- pour traçabilité
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_consents_booking
  ON public.booking_consents(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_consents_email
  ON public.booking_consents(client_email, signed_at DESC);

ALTER TABLE public.booking_consents ENABLE ROW LEVEL SECURITY;

-- Lecture : seul le pro propriétaire de la réservation peut voir le consentement
DROP POLICY IF EXISTS "consent read by pro" ON public.booking_consents;
CREATE POLICY "consent read by pro"
  ON public.booking_consents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.user_id = auth.uid()
    )
  );

-- Insertion : accessible à tous (client non authentifié possible)
DROP POLICY IF EXISTS "consent insert anon" ON public.booking_consents;
CREATE POLICY "consent insert anon"
  ON public.booking_consents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role peut tout faire (pour les liaisons post-paiement)
DROP POLICY IF EXISTS "consent service" ON public.booking_consents;
CREATE POLICY "consent service"
  ON public.booking_consents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
