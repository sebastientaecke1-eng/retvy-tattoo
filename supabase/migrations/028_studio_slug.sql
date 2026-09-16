-- Ajout d'un slug dédié au studio (distinct du slug de l'artiste propriétaire)
ALTER TABLE pro_profiles
  ADD COLUMN IF NOT EXISTS studio_slug TEXT UNIQUE;

-- Index pour les lookups rapides
CREATE INDEX IF NOT EXISTS idx_pro_profiles_studio_slug
  ON pro_profiles (studio_slug)
  WHERE studio_slug IS NOT NULL;

-- Auto-générer le studio_slug à partir du nom du studio pour les profils existants
-- (uniquement pour les propriétaires de studio qui ont un nom de studio)
UPDATE pro_profiles
SET studio_slug = regexp_replace(
  lower(
    translate(
      studio,
      'àáâãäåæçèéêëìíîïðñòóôõöùúûüýÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝŸ ',
      'aaaaaaeceeeeiiiidnoooouuuuyyAAAAAEACEEEEIIIIDNOOOOOUUUUYY-'
    )
  ),
  '[^a-z0-9-]', '', 'g'
)
WHERE is_sub_profile = FALSE
  AND studio IS NOT NULL
  AND studio != ''
  AND studio_slug IS NULL;
