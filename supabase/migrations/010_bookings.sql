-- Réservations pro (dashboard /pro/dashboard/reservations)

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  project_description text,
  style text,
  zone text,
  size text,
  reference_image_url text,
  booking_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60
    CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  deposit_amount integer NOT NULL DEFAULT 0
    CHECK (deposit_amount >= 0),
  deposit_paid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  cancellation_policy text NOT NULL DEFAULT '48h'
    CHECK (cancellation_policy IN ('24h', '48h', '72h', 'non_refundable')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_date
  ON public.bookings(user_id, booking_date);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings owner read" ON public.bookings;
CREATE POLICY "bookings owner read"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings owner write" ON public.bookings;
CREATE POLICY "bookings owner write"
  ON public.bookings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
