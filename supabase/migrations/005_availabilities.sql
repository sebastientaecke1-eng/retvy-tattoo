-- Disponibilités pro : horaires, dates bloquées, durées par style

CREATE TABLE IF NOT EXISTS public.pro_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_schedules_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_pro_schedules_user_day
  ON public.pro_schedules(user_id, day_of_week);

CREATE TABLE IF NOT EXISTS public.pro_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_pro_blocked_dates_user
  ON public.pro_blocked_dates(user_id, blocked_date);

CREATE TABLE IF NOT EXISTS public.pro_style_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60
    CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, style)
);

ALTER TABLE public.pro_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_style_durations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules public read" ON public.pro_schedules;
CREATE POLICY "schedules public read"
  ON public.pro_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedules owner write" ON public.pro_schedules;
CREATE POLICY "schedules owner write"
  ON public.pro_schedules FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blocked dates public read" ON public.pro_blocked_dates;
CREATE POLICY "blocked dates public read"
  ON public.pro_blocked_dates FOR SELECT USING (true);

DROP POLICY IF EXISTS "blocked dates owner write" ON public.pro_blocked_dates;
CREATE POLICY "blocked dates owner write"
  ON public.pro_blocked_dates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style durations public read" ON public.pro_style_durations;
CREATE POLICY "style durations public read"
  ON public.pro_style_durations FOR SELECT USING (true);

DROP POLICY IF EXISTS "style durations owner write" ON public.pro_style_durations;
CREATE POLICY "style durations owner write"
  ON public.pro_style_durations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
