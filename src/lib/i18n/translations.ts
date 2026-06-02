export type Locale = "fr" | "en";
export type Theme = "dark" | "light";

export const translations = {
  fr: {
    nav: {
      qualify: "Qualifier mon projet",
      exampleProfile: "Exemple profil",
      login: "Connexion",
      client: "Client",
      pro: "Pro",
      settings: "Paramètres",
      settingsAria: "Ouvrir les paramètres",
    },
    footer: {
      tagline: "Marketplace tatouage & piercing en France.",
      login: "Connexion",
      becomePro: "Devenir pro",
    },
    home: {
      badge: "IA + marketplace France",
      title: "Votre projet de tatouage,",
      titleHighlight: "guidé puis matché",
      subtitle:
        "Retvy qualifie votre idée avec l'intelligence artificielle, puis vous oriente vers les tatoueurs et pierceurs les plus adaptés à votre style, votre ville et votre budget.",
      ctaAi: "Démarrer avec l'IA",
      ctaPro: "Je suis professionnel",
      chatTitle: "Parlez-nous de votre projet",
      chatSubtitle:
        "L'assistant affine emplacement, style, dimensions et budget avant de vous proposer une sélection d'artistes.",
      chatSoon: "Chat bientôt disponible.",
      feature1Title: "Qualification IA",
      feature1Text:
        "GPT-4o mini comprend votre brief et structure les critères de recherche.",
      feature2Title: "Pros en France",
      feature2Text:
        "Tatoueurs et pierceurs vérifiés, profils publics sur /ink/[slug].",
      feature3Title: "Paiements sécurisés",
      feature3Text:
        "Stripe Connect pour les pros, réservation et facturation simplifiées.",
    },
    login: {
      back: "← Retvy",
      title: "Connexion",
      subtitle:
        "Client ou professionnel — redirection automatique selon votre rôle.",
      loading: "Chargement…",
      cardHint: "Retrouvez vos rendez-vous ou votre espace professionnel.",
      email: "Email",
      password: "Mot de passe",
      submit: "Se connecter",
      submitting: "Connexion…",
      noAccount: "Pas de compte ?",
      client: "Client",
      pro: "Pro",
    },
    signupClient: {
      back: "← Retvy",
      title: "Inscription client",
      subtitle: "Suivez vos projets qualifiés par l'IA et vos rendez-vous.",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      password: "Mot de passe (8+ caractères)",
      submit: "Créer mon compte",
      submitting: "Création…",
      already: "Un compte existe déjà.",
      signIn: "Connectez-vous",
      alreadyRegistered: "Déjà inscrit ?",
      success:
        "Compte créé ! Vérifiez votre boîte mail pour activer votre compte.",
    },
    signupPro: {
      title: "Inscription professionnel",
      subtitle:
        "Compte, profil public, abonnement pro (2 mois offerts) et paiements",
      hasAccount: "Déjà un compte ? Connectez-vous",
      loading: "Chargement…",
    },
    settings: {
      title: "Paramètres",
      back: "← Retvy",
      appearance: "Apparence",
      appearanceHint: "Choisissez le thème d'affichage du site.",
      dark: "Sombre",
      light: "Clair",
      language: "Langue",
      languageHint: "Langue de l'interface.",
      french: "Français",
      english: "English",
    },
  },
  en: {
    nav: {
      qualify: "Qualify my project",
      exampleProfile: "Sample profile",
      login: "Log in",
      client: "Client",
      pro: "Pro",
      settings: "Settings",
      settingsAria: "Open settings",
    },
    footer: {
      tagline: "Tattoo & piercing marketplace in France.",
      login: "Log in",
      becomePro: "Become a pro",
    },
    home: {
      badge: "AI + marketplace France",
      title: "Your tattoo project,",
      titleHighlight: "guided then matched",
      subtitle:
        "Retvy qualifies your idea with artificial intelligence, then connects you with tattoo artists and piercers suited to your style, city, and budget.",
      ctaAi: "Start with AI",
      ctaPro: "I'm a professional",
      chatTitle: "Tell us about your project",
      chatSubtitle:
        "The assistant refines placement, style, size, and budget before suggesting artists.",
      chatSoon: "Chat coming soon.",
      feature1Title: "AI qualification",
      feature1Text:
        "GPT-4o mini understands your brief and structures search criteria.",
      feature2Title: "Pros in France",
      feature2Text: "Verified artists with public profiles at /ink/[slug].",
      feature3Title: "Secure payments",
      feature3Text:
        "Stripe Connect for pros, simplified booking and billing.",
    },
    login: {
      back: "← Retvy",
      title: "Log in",
      subtitle: "Client or pro — automatic redirect based on your role.",
      loading: "Loading…",
      cardHint: "Access your bookings or professional space.",
      email: "Email",
      password: "Password",
      submit: "Log in",
      submitting: "Logging in…",
      noAccount: "No account?",
      client: "Client",
      pro: "Pro",
    },
    signupClient: {
      back: "← Retvy",
      title: "Client sign up",
      subtitle: "Track AI-qualified projects and your appointments.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      password: "Password (8+ characters)",
      submit: "Create my account",
      submitting: "Creating…",
      already: "An account already exists.",
      signIn: "Log in",
      alreadyRegistered: "Already registered?",
      success: "Account created! Check your inbox to activate your account.",
    },
    signupPro: {
      title: "Professional sign up",
      subtitle: "Account, public profile, pro plan (2 months free) and payments",
      hasAccount: "Already have an account? Log in",
      loading: "Loading…",
    },
    settings: {
      title: "Settings",
      back: "← Retvy",
      appearance: "Appearance",
      appearanceHint: "Choose how the site is displayed.",
      dark: "Dark",
      light: "Light",
      language: "Language",
      languageHint: "Interface language.",
      french: "Français",
      english: "English",
    },
  },
} as const;

export type TranslationKey = keyof (typeof translations)["fr"];
