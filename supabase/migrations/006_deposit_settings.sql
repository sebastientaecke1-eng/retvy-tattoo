-- Paramètres acompte et annulation par pro

CREATE TABLE IF NOT EXISTS public.pro_deposit_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_type text NOT NULL DEFAULT 'fixed'
    CHECK (deposit_type IN ('fixed', 'percent')),
  cancellation_policy text NOT NULL DEFAULT '48h'
    CHECK (cancellation_policy IN ('24h', '48h', '72h', 'non_refundable')),
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_deposit_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit settings public read" ON public.pro_deposit_settings;
CREATE POLICY "deposit settings public read"
  ON public.pro_deposit_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "deposit settings owner write" ON public.pro_deposit_settings;
CREATE POLICY "deposit settings owner write"
  ON public.pro_deposit_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
