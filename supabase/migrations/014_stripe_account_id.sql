-- Stripe Connect Express (Account Links)

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Reprendre les comptes déjà créés via l'ancienne colonne
UPDATE public.pro_profiles
SET stripe_account_id = stripe_connect_account_id
WHERE stripe_account_id IS NULL
  AND stripe_connect_account_id IS NOT NULL;
