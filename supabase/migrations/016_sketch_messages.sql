-- Messages tchat croquis (pro ↔ client)

CREATE TABLE IF NOT EXISTS public.sketch_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('pro', 'client')),
  message text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sketch_messages_booking_created
  ON public.sketch_messages(booking_id, created_at ASC);

ALTER TABLE public.sketch_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sketch_messages pro" ON public.sketch_messages;
CREATE POLICY "sketch_messages pro"
  ON public.sketch_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_role = 'pro'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sketch_messages client read" ON public.sketch_messages;
CREATE POLICY "sketch_messages client read"
  ON public.sketch_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.client_id = auth.uid()
          OR lower(b.client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

DROP POLICY IF EXISTS "sketch_messages client insert" ON public.sketch_messages;
CREATE POLICY "sketch_messages client insert"
  ON public.sketch_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'client'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.client_id = auth.uid()
          OR lower(b.client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );
