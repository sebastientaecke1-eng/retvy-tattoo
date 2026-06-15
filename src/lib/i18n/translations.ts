export type Locale = "fr" | "en";
export type Theme = "dark" | "light";

export const translations = {
  fr: {
    nav: {
      qualify: "Qualifier mon projet",
      demoProfile: "Exemple profil",
      login: "Connexion",
      client: "Client",
      pro: "Pro",
      settings: "Paramètres",
    },
    footer: {
      tagline: "Marketplace tatouage en France.",
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
      sectionTitle: "Parlez-nous de votre projet",
      sectionSubtitle:
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
      title: "Connexion",
      subtitle: "Client ou professionnel — redirection automatique selon votre rôle.",
      cardHint: "Retrouvez vos rendez-vous ou votre espace professionnel.",
      email: "Email",
      password: "Mot de passe",
      submit: "Se connecter",
      submitting: "Connexion…",
      noAccount: "Pas de compte ?",
      back: "← Retvy",
    },
    signup: {
      title: "Inscription client",
      subtitle: "Suivez vos projets qualifiés par l'IA et vos rendez-vous.",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      password: "Mot de passe (8+ caractères)",
      submit: "Créer mon compte",
      submitting: "Création…",
      already: "Déjà inscrit ?",
      accountExists: "Un compte existe déjà.",
      signIn: "Connectez-vous",
      emailConfirm:
        "Compte créé ! Vérifiez votre boîte mail pour activer votre compte.",
      back: "← Retvy",
    },
    settings: {
      title: "Paramètres",
      subtitle: "Personnalisez l'apparence et la langue de Retvy.",
      appearance: "Apparence",
      themeDark: "Mode sombre",
      themeLight: "Mode clair",
      language: "Langue",
      french: "Français",
      english: "English",
      saved: "Préférences enregistrées.",
      backDashboard: "Retour au tableau de bord",
      backHome: "Accueil",
      dangerZone: "Zone de danger",
      dangerHint:
        "La suppression de votre compte efface définitivement votre profil et toutes vos données.",
      deleteAccount: "Supprimer mon compte",
      deleteModalTitle: "Supprimer définitivement votre compte ?",
      deleteModalBody:
        "Cette action est irréversible. Votre compte, profil et toutes vos données seront définitivement supprimés.",
      deleteConfirmLabel:
        'Tapez « SUPPRIMER » pour confirmer',
      deleteCancel: "Annuler",
      deleteConfirm: "Confirmer la suppression",
      deleteSubmitting: "Suppression…",
      deleteError: "Impossible de supprimer le compte. Réessayez ou contactez le support.",
    },
  },
  en: {
    nav: {
      qualify: "Qualify my project",
      demoProfile: "Sample profile",
      login: "Log in",
      client: "Client",
      pro: "Pro",
      settings: "Settings",
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
      sectionTitle: "Tell us about your project",
      sectionSubtitle:
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
      title: "Log in",
      subtitle: "Client or pro — automatic redirect based on your role.",
      cardHint: "Access your appointments or professional workspace.",
      email: "Email",
      password: "Password",
      submit: "Log in",
      submitting: "Signing in…",
      noAccount: "No account?",
      back: "← Retvy",
    },
    signup: {
      title: "Client sign-up",
      subtitle: "Track AI-qualified projects and your appointments.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      password: "Password (8+ characters)",
      submit: "Create my account",
      submitting: "Creating…",
      already: "Already registered?",
      accountExists: "An account already exists.",
      signIn: "Log in",
      emailConfirm:
        "Account created! Check your inbox to activate your account.",
      back: "← Retvy",
    },
    settings: {
      title: "Settings",
      subtitle: "Customize Retvy appearance and language.",
      appearance: "Appearance",
      themeDark: "Dark mode",
      themeLight: "Light mode",
      language: "Language",
      french: "Français",
      english: "English",
      saved: "Preferences saved.",
      backDashboard: "Back to dashboard",
      backHome: "Home",
      dangerZone: "Danger zone",
      dangerHint:
        "Deleting your account permanently removes your profile and all associated data.",
      deleteAccount: "Delete my account",
      deleteModalTitle: "Permanently delete your account?",
      deleteModalBody:
        "This action cannot be undone. Your account, profile, and all your data will be permanently deleted.",
      deleteConfirmLabel: 'Type "SUPPRIMER" to confirm',
      deleteCancel: "Cancel",
      deleteConfirm: "Confirm deletion",
      deleteSubmitting: "Deleting…",
      deleteError: "Could not delete your account. Please try again or contact support.",
    },
  },
} as const;

export type TranslationKey = keyof (typeof translations)["fr"];
