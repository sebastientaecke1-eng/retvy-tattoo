-- Migration 019: Ajouter la colonne subscription_tier à pro_profiles
-- Cette colonne stocke le tier de l'abonnement ("1", "23", "3plus")
-- séparément du status Stripe ("active", "trialing", etc.)

ALTER TABLE pro_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT 
CHECK (subscription_tier IN ('1', '23', '3plus'));

-- Backfill: les profils actifs sans tier connu → tier "1" par défaut
UPDATE pro_profiles 
SET subscription_tier = '1'
WHERE is_sub_profile = false 
  AND subscription_status IN ('active', 'trialing')
  AND subscription_tier IS NULL;

-- Pour les comptes multi-artiste existants, mettre à jour manuellement :
-- UPDATE pro_profiles SET subscription_tier = '23'    WHERE user_id = '<user_id>';
-- UPDATE pro_profiles SET subscription_tier = '3plus' WHERE user_id = '<user_id>';
