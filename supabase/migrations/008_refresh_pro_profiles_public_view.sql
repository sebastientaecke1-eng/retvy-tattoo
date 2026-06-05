-- Rafraîchit la vue publique (avatar_url et colonnes ink)

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
  price_min,
  price_max,
  status
FROM public.pro_profiles
WHERE slug IS NOT NULL
  AND artist_name IS NOT NULL;

GRANT SELECT ON public.pro_profiles_public TO anon, authenticated;
