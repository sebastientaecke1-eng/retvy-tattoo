-- Fiche santé client (taille, poids, âge, maladies)
-- Utilisée par le tatoueur pour anticiper les contre-indications médicales.

CREATE TABLE IF NOT EXISTS client_health_profiles (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm       smallint  DEFAULT NULL,          -- taille en cm
  weight_kg       smallint  DEFAULT NULL,          -- poids en kg
  birth_year      smallint  DEFAULT NULL,          -- année de naissance (calcul âge côté client)
  has_conditions  boolean   NOT NULL DEFAULT false, -- maladie / contre-indication connue
  conditions_note text      DEFAULT NULL,           -- précisions libres si has_conditions = true
  updated_at      timestamptz DEFAULT now() NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT client_health_profiles_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_health_profiles_user ON client_health_profiles(user_id);

ALTER TABLE client_health_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture / écriture uniquement par le propriétaire
CREATE POLICY "owner_all" ON client_health_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Lecture par le service role (pour le dashboard pro)
CREATE POLICY "service_read" ON client_health_profiles
  FOR SELECT TO service_role USING (true);
