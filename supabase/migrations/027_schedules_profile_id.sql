-- Migration 027: ajouter profile_id à pro_schedules
ALTER TABLE public.pro_schedules
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.pro_profiles(id) ON DELETE CASCADE;

-- Backfill: associer les lignes existantes au profil principal
UPDATE public.pro_schedules s
SET profile_id = p.id
FROM public.pro_profiles p
WHERE p.user_id = s.user_id AND p.is_sub_profile = false AND s.profile_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pro_schedules_profile_id ON public.pro_schedules(profile_id);
