-- Migration 026: isoler les données par profile_id
-- Les tables pro_availability, pro_blocked_dates, pro_style_durations,
-- pro_deposit_rules, pro_portfolio et pro_pricing_settings étaient liées
-- uniquement par user_id. Avec les sous-profils, plusieurs profils partagent
-- le même user_id. On ajoute profile_id pour que chaque profil ait ses propres données.

-- 1. Ajouter profile_id à chaque table (nullable pour backfill)
ALTER TABLE public.pro_availability
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pro_blocked_dates
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pro_style_durations
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pro_deposit_rules
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pro_portfolio
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

-- 2. Backfill: associer les lignes existantes au profil principal (is_sub_profile = false)
UPDATE public.pro_availability a
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = a.user_id AND p.is_sub_profile = false AND a.profile_id IS NULL;

UPDATE public.pro_blocked_dates b
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = b.user_id AND p.is_sub_profile = false AND b.profile_id IS NULL;

UPDATE public.pro_style_durations s
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = s.user_id AND p.is_sub_profile = false AND s.profile_id IS NULL;

UPDATE public.pro_deposit_rules d
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = d.user_id AND p.is_sub_profile = false AND d.profile_id IS NULL;

UPDATE public.pro_portfolio po
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = po.user_id AND p.is_sub_profile = false AND po.profile_id IS NULL;

-- 3. pro_pricing_settings: ajouter profile_id (la PK reste user_id pour compatibilité,
--    mais on ajoute profile_id pour l'isolation)
ALTER TABLE public.pro_pricing_settings
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

UPDATE public.pro_pricing_settings ps
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = ps.user_id AND p.is_sub_profile = false AND ps.profile_id IS NULL;

-- 4. Index pour les requêtes par profile_id
CREATE INDEX IF NOT EXISTS idx_pro_availability_profile_id ON public.pro_availability(profile_id);
CREATE INDEX IF NOT EXISTS idx_pro_blocked_dates_profile_id ON public.pro_blocked_dates(profile_id);
CREATE INDEX IF NOT EXISTS idx_pro_style_durations_profile_id ON public.pro_style_durations(profile_id);
CREATE INDEX IF NOT EXISTS idx_pro_deposit_rules_profile_id ON public.pro_deposit_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_pro_portfolio_profile_id ON public.pro_portfolio(profile_id);
CREATE INDEX IF NOT EXISTS idx_pro_pricing_settings_profile_id ON public.pro_pricing_settings(profile_id);
