-- Coordonnées GPS des studios pro (géocodage Nominatim)

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE OR REPLACE VIEW public.pro_profiles_public
WITH (security_invoker = false) AS
SELECT
  user_id,
  slug,
  artist_name,
  studio,
  styles,
  avatar_url,
  cover_url,
  bio,
  city,
  latitude,
  longitude,
  price_min,
  price_max,
  status
FROM public.pro_profiles
WHERE slug IS NOT NULL
  AND artist_name IS NOT NULL;

GRANT SELECT ON public.pro_profiles_public TO anon, authenticated;
