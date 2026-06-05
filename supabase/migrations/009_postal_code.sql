-- Code postal du studio (profil pro + page publique /ink)

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS postal_code text;
