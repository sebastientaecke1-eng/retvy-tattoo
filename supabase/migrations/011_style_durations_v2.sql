-- Durées par style et tranche de taille (petit / moyen / grand)

ALTER TABLE public.pro_style_durations
  ADD COLUMN IF NOT EXISTS size_category text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS duration_min_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_max_minutes integer;

UPDATE public.pro_style_durations
SET
  size_category = COALESCE(size_category, 'medium'),
  duration_min_minutes = COALESCE(duration_min_minutes, duration_minutes),
  duration_max_minutes = COALESCE(duration_max_minutes, duration_minutes)
WHERE duration_min_minutes IS NULL OR duration_max_minutes IS NULL;

ALTER TABLE public.pro_style_durations
  DROP CONSTRAINT IF EXISTS pro_style_durations_user_id_style_key;

INSERT INTO public.pro_style_durations (
  user_id, style, size_category,
  duration_min_minutes, duration_max_minutes, duration_minutes
)
SELECT d.user_id, d.style, 'small', 30, 90, 60
FROM public.pro_style_durations d
WHERE d.size_category = 'medium'
  AND NOT EXISTS (
    SELECT 1 FROM public.pro_style_durations x
    WHERE x.user_id = d.user_id
      AND x.style = d.style
      AND x.size_category = 'small'
  );

INSERT INTO public.pro_style_durations (
  user_id, style, size_category,
  duration_min_minutes, duration_max_minutes, duration_minutes
)
SELECT d.user_id, d.style, 'large', 180, 360, 270
FROM public.pro_style_durations d
WHERE d.size_category = 'medium'
  AND NOT EXISTS (
    SELECT 1 FROM public.pro_style_durations x
    WHERE x.user_id = d.user_id
      AND x.style = d.style
      AND x.size_category = 'large'
  );

UPDATE public.pro_style_durations
SET
  duration_min_minutes = 90,
  duration_max_minutes = 180,
  duration_minutes = 135
WHERE size_category = 'medium'
  AND duration_min_minutes = duration_max_minutes;

ALTER TABLE public.pro_style_durations
  DROP CONSTRAINT IF EXISTS pro_style_durations_user_style_size_key;

ALTER TABLE public.pro_style_durations
  ADD CONSTRAINT pro_style_durations_user_style_size_key
  UNIQUE (user_id, style, size_category);

ALTER TABLE public.pro_style_durations
  DROP CONSTRAINT IF EXISTS pro_style_durations_size_category_check;

ALTER TABLE public.pro_style_durations
  ADD CONSTRAINT pro_style_durations_size_category_check
  CHECK (size_category IN ('small', 'medium', 'large'));

ALTER TABLE public.pro_style_durations
  DROP CONSTRAINT IF EXISTS pro_style_durations_range_check;

ALTER TABLE public.pro_style_durations
  ADD CONSTRAINT pro_style_durations_range_check
  CHECK (
    duration_min_minutes IS NULL
    OR duration_max_minutes IS NULL
    OR (
      duration_min_minutes > 0
      AND duration_max_minutes >= duration_min_minutes
      AND duration_max_minutes <= 1440
    )
  );
