-- Migration 020: Supprimer la contrainte UNIQUE sur user_id dans pro_profiles
-- Nécessaire pour le multi-artiste : plusieurs profils peuvent partager le même user_id
-- (profil principal + sous-profils avec is_sub_profile = true)
-- Le slug reste UNIQUE, ce qui est suffisant pour l'unicité publique.

ALTER TABLE pro_profiles DROP CONSTRAINT IF EXISTS pro_profiles_user_id_key;
