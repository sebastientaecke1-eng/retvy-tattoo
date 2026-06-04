# Retvy v2

Marketplace de réservation pour tatoueurs et pierceurs en France — Next.js 14, Supabase, Stripe, OpenAI.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — auth + tables `user_roles`, `pro_profiles`
- **Stripe Connect** — onboarding pro (`/api/stripe/connect`)
- **OpenAI** — chat qualification projet (`/api/chat`)
- **Brevo** — variables prêtes pour les emails transactionnels

## Routes

| Route | Description |
|-------|-------------|
| `/` | Accueil + chat IA |
| `/connexion` | Connexion client ou pro |
| `/inscription-client` | Inscription client |
| `/pro/inscription` | Inscription pro (4 étapes) |
| `/pro/dashboard` | Dashboard tatoueur |
| `/client/dashboard` | Dashboard client |
| `/ink/[slug]` | Profil public (ex. `/ink/demo`) |

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir OPENAI_API_KEY et STRIPE_WEBHOOK_SECRET
npm run dev
```

### Chat IA (accueil)

Ajoutez `OPENAI_API_KEY` dans `.env.local`. Le chat stream via GPT-4o mini et propose des artistes matchés après qualification du projet.

### Abonnement pro (Stripe Billing)

1. `STRIPE_PRICE_ID` — prix d'abonnement mensuel
2. Webhook local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Copiez le secret dans `STRIPE_WEBHOOK_SECRET`

Checkout abonnement : Edge Function Supabase `stripe-checkout` (pas d’API Worker). Sans webhook, le retour Stripe passe par `GET /api/stripe/checkout/confirm`.

Ouvrir [http://localhost:3000](http://localhost:3000).

## Design

Thème sombre : fond noir (`#000`), accents dorés/amber (`#f59e0b`).
