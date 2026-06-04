-- Pages publiques /ink/[slug] : lecture via vue (colonnes sûres uniquement).
-- security_invoker = false → la vue s'exécute avec les droits du propriétaire (bypass RLS sur pro_profiles).

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

-- Lecture directe de sa propre ligne (dashboard, paramètres)
DROP POLICY IF EXISTS "Owners can read own pro profile" ON public.pro_profiles;
CREATE POLICY "Owners can read own pro profile"
  ON public.pro_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
