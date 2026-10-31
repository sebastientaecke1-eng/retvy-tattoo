"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import {
  createClientOrNull,
  getBrowserSupabaseEnvError,
} from "@/lib/supabase/client";
import {
  ONBOARDING_SESSION_KEY,
  readOnboardingStoredSession,
  restoreSessionFromOnboardingStorage,
} from "@/lib/supabase/onboarding-session";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/supabase/public-config";
import {
  type ProStyleSelection,
  fetchTattooStyleCatalog,
  resolveStyleIdsForSave,
} from "@/lib/pro/tattoo-style-catalog";
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  syncProOnboardingStepUrl,
  writeOnboardingDraft,
} from "@/lib/pro/onboarding-draft";
import {
  ACCOUNT_STEP_INCOMPLETE_MESSAGE,
  accountFieldsFromUser,
  isAccountStepComplete,
} from "@/lib/pro/onboarding-account-fields";
import {
  isProAddressComplete,
  ProAddressFields,
} from "@/components/pro/pro-address-fields";
import { ProStylePicker } from "@/components/pro/pro-style-picker";
import {
  isAlreadyRegisteredAuthError,
} from "@/lib/auth/signup-flow";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Banknote, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import type { PlanTier, PlanBilling } from "@/lib/stripe/plans";

const STEPS = ["Compte", "Infos", "Styles", "Slug", "Abonnement", "Stripe"] as const;
const MAX_STEP = STEPS.length - 1;
const SLUG_PATTERN = /^[a-z0-9]{3,32}$/;
type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

type StoredSession = {
  access_token: string;
  refresh_token: string;
};

type EstablishSessionResult = {
  session: Session | null;
  pendingEmail: boolean;
};

/* ─── Tarifs ─────────────────────────────────────────────────── */
const TIER_LABELS: Record<Exclude<PlanTier, "free">, { short: string; long: string }> = {
  "starter": { short: "Starter", long: "Starter — 22 €/mois" },
  "pro":     { short: "Pro",     long: "Pro — 27 €/mois" },
  "premium": { short: "Premium", long: "Premium — 30 €/mois" },
};

const MONTHLY_PRICES: Record<Exclude<PlanTier, "free">, number> = { starter: 22, pro: 27, premium: 30 };
const ANNUAL_PRICES:  Record<Exclude<PlanTier, "free">, number> = { starter: 220, pro: 270, premium: 300 };

function getPrice(tier: Exclude<PlanTier, "free">, billing: PlanBilling) {
  return billing === "monthly" ? MONTHLY_PRICES[tier] : ANNUAL_PRICES[tier];
}

/* ─── Composant ──────────────────────────────────────────────── */
export function OnboardingWizard() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [artistName, setArtistName] = useState("");
  const [studio, setStudio] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  const [styleSelection, setStyleSelection] = useState<ProStyleSelection>({
    familySlugs: [],
    styleIds: [],
  });
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [envError, setEnvError] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [abonnementNeedsReconnect, setAbonnementNeedsReconnect] = useState(false);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const authSessionRef = useRef<Session | null>(null);
  const draftHydratedRef = useRef(false);
  const [draftPersistReady, setDraftPersistReady] = useState(false);

  // ── Abonnement state ──
  const [selectedTier, setSelectedTier] = useState<PlanTier>("premium");
  const [selectedBilling, setSelectedBilling] = useState<PlanBilling>("monthly");
  const [multiArtists, setMultiArtists] = useState<"none" | "small" | "large">("none");
  /** null = pas encore choisi, true = promo, false = tarif normal */
  const [promoChoice, setPromoChoice] = useState<boolean | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);

  const goToStep = useCallback((next: number, urlOptions?: Parameters<typeof syncProOnboardingStepUrl>[1]) => {
    const clamped = Math.min(MAX_STEP, Math.max(0, next));
    setStep(clamped);
    syncProOnboardingStepUrl(clamped, urlOptions);
  }, []);

  const applyAccountFieldsFromUser = useCallback((user: Session["user"]) => {
    const fromUser = accountFieldsFromUser(user);
    setFirstName((prev) => prev.trim() || fromUser.firstName);
    setLastName((prev) => prev.trim() || fromUser.lastName);
    setEmail((prev) => prev.trim() || fromUser.email);
    setPhone((prev) => prev.trim() || fromUser.phone);
  }, []);

  const prefillAccountFieldsFromAuth = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    applyAccountFieldsFromUser(user);
  }, [applyAccountFieldsFromUser]);

  const requireAccountStepComplete = useCallback((): boolean => {
    if (isAccountStepComplete({ firstName, lastName, email, phone })) return true;
    setError(ACCOUNT_STEP_INCOMPLETE_MESSAGE);
    goToStep(0);
    return false;
  }, [email, firstName, goToStep, lastName, phone]);

  useEffect(() => {
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    setEnvError(getBrowserSupabaseEnvError());

    const draft = readOnboardingDraft();
    const sub = searchParams.get("sub");
    const connect = searchParams.get("connect");
    const stepParam = searchParams.get("step");

    if (draft) {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setEmail(draft.email);
      setArtistName(draft.artistName);
      setStudio(draft.studio);
      setCity(draft.city);
      setAddress(draft.address);
      setPostalCode(draft.postalCode);
      setPhone(draft.phone);
      setStyleSelection(draft.styleSelection);
      setSlug(draft.slug);
      setSlugTouched(draft.slugTouched);
      setEmailPending(draft.emailPending);
      setEmailConfirmed(draft.emailConfirmed);
    }

    // Pré-remplir le tier et billing depuis l'URL (?tier=pro&billing=annual)
    const tierParam = searchParams.get("tier");
    if (tierParam && ["starter", "pro", "premium"].includes(tierParam)) {
      setSelectedTier(tierParam as PlanTier);
    }
    const billingParam = searchParams.get("billing");
    if (billingParam === "annual" || billingParam === "monthly") {
      setSelectedBilling(billingParam as import("@/lib/stripe/plans").PlanBilling);
    }

    // Pré-remplir le code de parrainage depuis l'URL ?ref=
    const refParam = searchParams.get("ref");
    if (refParam) setReferralCode(refParam.toUpperCase().trim());

    if (sub === "error") {
      setError("La confirmation du paiement a échoué. Réessayez l'abonnement.");
      goToStep(4, { extra: { sub: "error" } });
      setDraftPersistReady(true);
      void prefillAccountFieldsFromAuth();
      return;
    }

    const externalReturn = sub === "ok" || connect === "done";
    if (externalReturn && stepParam != null) {
      const n = Number.parseInt(stepParam, 10);
      if (Number.isFinite(n) && n >= 0 && n <= MAX_STEP) {
        goToStep(n, {
          extra: {
            sub: sub ?? undefined,
            connect: connect ?? undefined,
            session_id: searchParams.get("session_id") ?? undefined,
          },
        });
        setDraftPersistReady(true);
        void prefillAccountFieldsFromAuth();
        return;
      }
    }

    if (draft) {
      goToStep(draft.step);
    }
    // Sans brouillon, on ignore ?step= et on commence toujours à l'étape 0

    setDraftPersistReady(true);
    void prefillAccountFieldsFromAuth();
  }, [searchParams, goToStep, prefillAccountFieldsFromAuth]);

  useEffect(() => {
    if (!draftPersistReady) return;
    // Étape 1 (step 0) : pas de souvenir — on efface le brouillon
    if (step === 0) { clearOnboardingDraft(); return; }
    writeOnboardingDraft({
      version: 1,
      step,
      firstName,
      lastName,
      email,
      artistName,
      studio,
      city,
      address,
      postalCode,
      phone,
      styleSelection,
      slug,
      slugTouched,
      emailPending,
      emailConfirmed,
    });
  }, [
    step, firstName, lastName, email, artistName, studio, city, address,
    postalCode, phone, styleSelection, slug, slugTouched, emailPending,
    emailConfirmed, draftPersistReady,
  ]);

  const checkSlug = useCallback(async (value: string) => {
    if (!/^[a-z0-9]{3,32}$/.test(value)) { setSlugState("invalid"); return; }
    setSlugState("checking");
    const res = await fetch(`/api/pro/slug?slug=${encodeURIComponent(value)}`);
    const data = await res.json();
    setSlugState(data.available ? "available" : "taken");
  }, []);

  useEffect(() => {
    if (step !== 3 || !slug) return;
    const t = setTimeout(() => checkSlug(slug), 400);
    return () => clearTimeout(t);
  }, [slug, step, checkSlug]);

  useEffect(() => {
    if (!done) return;
    const current = slug.trim();
    if (SLUG_PATTERN.test(current)) return;
    const supabase = createClientOrNull();
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("pro_profiles").select("slug").eq("user_id", user.id).maybeSingle();
      if (data?.slug && SLUG_PATTERN.test(data.slug)) setSlug(data.slug);
    });
  }, [done, slug]);

  const readStoredSession = useCallback((): StoredSession | null => readOnboardingStoredSession(), []);

  const rememberSession = useCallback((session: Session | null) => {
    if (!session) return;
    setEmailPending(false);
    authSessionRef.current = session;
    setAuthSession(session);
    try {
      sessionStorage.setItem(
        ONBOARDING_SESSION_KEY,
        JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token } satisfies StoredSession),
      );
    } catch { /* quota / mode privé */ }
    applyAccountFieldsFromUser(session.user);
  }, [applyAccountFieldsFromUser]);

  const syncSessionToClient = useCallback(async (session: Session | StoredSession): Promise<Session | null> => {
    const supabase = createClientOrNull();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) {
      console.warn("[onboarding] setSession:", error.message);
      if ("user" in session && session.user) { rememberSession(session as Session); return session as Session; }
      return null;
    }
    const active = data.session;
    if (active) rememberSession(active);
    return active;
  }, [rememberSession]);

  const restoreSessionFromStorage = useCallback(async (): Promise<Session | null> => {
    const active = await restoreSessionFromOnboardingStorage();
    if (active) rememberSession(active);
    return active;
  }, [rememberSession]);

  useEffect(() => { void restoreSessionFromStorage(); }, [restoreSessionFromStorage]);

  useEffect(() => {
    const sub = searchParams.get("sub");
    const sessionId = searchParams.get("session_id");
    const connect = searchParams.get("connect");
    if (sub !== "ok" && connect !== "done") return;

    void (async () => {
      setLoading(true);
      setError(null);
      setAbonnementNeedsReconnect(false);

      try {
        const session = await restoreSessionFromStorage();
        if (!session) {
          setAbonnementNeedsReconnect(true);
          setError("Session expirée après le paiement. Reconnectez-vous avec le même email (étape Compte) pour accéder au dashboard.");
          if (sub === "ok") goToStep(4);
          return;
        }

        if (sub === "ok" && sessionId) {
          const res = await fetch("/api/stripe/checkout/confirm", {
            method: "POST",
            headers: apiAuthHeaders(session),
            credentials: "include",
            body: JSON.stringify({ sessionId }),
            signal: AbortSignal.timeout(25_000),
          });
          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? "Confirmation échouée");
          }
        }

        const storedDraft = readOnboardingDraft();
        if (storedDraft?.slug) setSlug(storedDraft.slug);

        if (sub === "ok") { goToStep(5, { extra: { sub: "ok" } }); setDone(true); }
        else if (connect === "done") { goToStep(5, { extra: { connect: "done" } }); setDone(true); }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
        if (sub === "ok") goToStep(4);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, restoreSessionFromStorage, goToStep]);

  async function signInWithPassword() {
    const supabase = createClientOrNull();
    if (!supabase) throw new Error(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials")) throw new Error("Mot de passe incorrect pour cet email.");
      if (msg.includes("not confirmed") || msg.includes("email")) throw new Error("Email non confirmé — vérifiez votre boîte mail avant de continuer.");
      throw new Error("Une erreur est survenue, réessayez.");
    }
    if (!data.session) throw new Error("Session non établie après connexion.");
    return (await syncSessionToClient(data.session)) ?? data.session;
  }

  async function establishSession(): Promise<EstablishSessionResult> {
    const supabase = createClientOrNull();
    if (!supabase) throw new Error(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");

    const { data: existing } = await supabase.auth.getSession();
    if (existing.session) {
      const synced = await syncSessionToClient(existing.session);
      return { session: synced ?? existing.session, pendingEmail: false };
    }

    const fromRef = authSessionRef.current;
    if (fromRef?.access_token) {
      const synced = await syncSessionToClient(fromRef);
      if (synced) return { session: synced, pendingEmail: false };
    }

    const stored = readStoredSession();
    if (stored) {
      const synced = await syncSessionToClient(stored);
      if (synced) return { session: synced, pendingEmail: false };
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "pro", email, password, firstName, lastName, phone: phone.trim() || undefined }),
    });
    const payload = (await res.json()) as { error?: string; code?: string; emailSent?: boolean; sessionEstablished?: boolean };

    if (!res.ok) {
      if (payload.code === "already_registered" || isAlreadyRegisteredAuthError(payload.error ?? "")) {
        setEmailPending(false);
        const session = await signInWithPassword();
        return { session, pendingEmail: false };
      }
      throw new Error(payload.error ?? "Inscription échouée");
    }

    if (payload.emailSent) { setEmailPending(true); return { session: null, pendingEmail: true }; }

    setEmailPending(false);
    const { data: fresh } = await supabase.auth.getSession();
    if (fresh.session) {
      const session = await syncSessionToClient(fresh.session);
      return { session: session ?? fresh.session, pendingEmail: false };
    }

    const session = await signInWithPassword();
    return { session, pendingEmail: false };
  }

  async function requireSession(): Promise<Session> {
    const supabase = createClientOrNull();
    if (!supabase) throw new Error(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");

    const { data: current } = await supabase.auth.getSession();
    if (current.session?.access_token) {
      const synced = await syncSessionToClient(current.session);
      if (synced?.access_token) return synced;
    }

    const fromRef = authSessionRef.current;
    if (fromRef?.access_token) {
      const synced = await syncSessionToClient(fromRef);
      if (synced?.access_token) return synced;
    }

    const stored = readStoredSession();
    if (stored) {
      const synced = await syncSessionToClient(stored);
      if (synced?.access_token) return synced;
    }

    if (authSession?.access_token) {
      const synced = await syncSessionToClient(authSession);
      if (synced?.access_token) return synced;
    }

    if (email && password.length >= 6) {
      const session = await signInWithPassword();
      if (session?.access_token) return session;
    }

    throw new Error("Session expirée. Revenez à l'étape Compte et reconnectez-vous avec le même email et mot de passe.");
  }

  function apiAuthHeaders(session?: Session | null): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token = session?.access_token ?? authSessionRef.current?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function createProfile(session: Session) {
    const supabase = createClientOrNull();
    if (!supabase) throw new Error(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");

    const catalog = await fetchTattooStyleCatalog(supabase);
    const styleIds = resolveStyleIdsForSave(catalog, styleSelection);
    if (styleIds.length === 0) throw new Error("Sélectionnez au moins une famille de styles.");

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      artist_name: artistName.trim(),
      studio: studio.trim() || null,
      city: city.trim(),
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      phone: phone.trim(),
      style_ids: styleIds,
      slug: slug.trim(),
    };

    console.error("[onboarding] POST /api/pro/profile payload", { ...payload, style_ids_count: styleIds.length });

    const res = await fetch("/api/pro/profile", {
      method: "POST",
      headers: apiAuthHeaders(session),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; slug?: string; issues?: Array<{ path: string; label: string; message: string }> };
    if (!res.ok) {
      console.error("[onboarding] POST /api/pro/profile failed", { status: res.status, error: data.error, issues: data.issues });
      throw new Error(data.error ?? "Erreur profil");
    }
    const savedSlug = (data.slug ?? slug).trim();
    if (savedSlug) setSlug(savedSlug);
  }

  async function validateReferralCodeInput(code: string) {
    const trimmed = code.toUpperCase().trim();
    if (!trimmed) { setReferralValid(null); return; }
    setReferralChecking(true);
    try {
      const res = await fetch("/api/pro/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await res.json()) as { valid?: boolean };
      setReferralValid(data.valid ?? false);
    } catch {
      setReferralValid(null);
    } finally {
      setReferralChecking(false);
    }
  }

  async function startCheckout(wantsPromo: boolean) {
    setLoading(true);
    setError(null);
    setAbonnementNeedsReconnect(false);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setAbonnementNeedsReconnect(true);
      setLoading(false);
      return;
    }

    rememberSession(session);

    const checkoutEmail = email.trim() || session.user.email || "";
    const checkoutName = `${firstName} ${lastName}`.trim() || artistName.trim() || "Pro Retvy";

    try {
      const res = await fetch("/api/stripe/checkout/create", {
        method: "POST",
        headers: apiAuthHeaders(session),
        credentials: "include",
        body: JSON.stringify({
          tier: selectedTier,
          billing: selectedBilling,
          multiArtists: multiArtists !== "none" ? multiArtists : undefined,
          email: checkoutEmail,
          name: checkoutName,
          userId: session.user.id,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur Stripe");
      if (!data.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
      setPromoChoice(null); // retour au sélecteur de plan pour afficher l'erreur
    }
  }

  async function connectStripe() {
    setLoading(true);
    setError(null);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Session expirée. Retournez à l'étape Compte pour vous reconnecter.");
      setLoading(false);
      return;
    }

    rememberSession(session);

    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: apiAuthHeaders(session),
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur Stripe Connect");
      if (!data.url) throw new Error("Stripe n'a pas renvoyé d'URL Connect.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  function goToProDashboard() { window.location.href = "/pro/dashboard"; }

  async function finalize() {
    setLoading(true);
    try {
      const supabase = createClientOrNull();
      if (!supabase) throw new Error(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.");
      const session = await requireSession();
      await supabase.from("pro_profiles").update({ status: "active" }).eq("user_id", session.user.id);
      clearOnboardingDraft();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    setError(null);

    if (step === 0) {
      if (!firstName || !lastName || !email || password.length < 6) {
        setError("Remplissez tous les champs (mot de passe 6+ caractères).");
        return;
      }
      setLoading(true);
      try {
        const { session, pendingEmail } = await establishSession();
        if (!session && pendingEmail) { goToStep(1); return; }
        if (!session?.access_token) throw new Error("Session non établie après inscription. Réessayez ou connectez-vous.");
        goToStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 1) {
      if (!requireAccountStepComplete()) return;
      if (!artistName.trim() || !phone.trim()) { setError("Nom d'artiste et téléphone requis."); return; }
      if (!isProAddressComplete({ address, city })) {
        setError("Adresse et ville requises. Choisissez une suggestion ou saisissez-les manuellement.");
        return;
      }
      goToStep(2);
      return;
    }

    if (step === 2) {
      if (!requireAccountStepComplete()) return;
      const supabase = createClientOrNull();
      if (!supabase) { setError(getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante."); return; }
      setLoading(true);
      try {
        const catalog = await fetchTattooStyleCatalog(supabase);
        const styleIds = resolveStyleIdsForSave(catalog, styleSelection);
        if (styleIds.length === 0) { setError("Sélectionnez au moins une famille de styles."); return; }
        goToStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement des styles.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 3) {
      if (!requireAccountStepComplete()) return;
      if (slugState !== "available") { setError("Choisissez un slug disponible."); return; }
      setLoading(true);
      try {
        const session = await requireSession();
        if (!session.access_token) throw new Error("Session invalide. Reconnectez-vous à l'étape Compte.");
        await createProfile(session);
        setError(null);
        setAbonnementNeedsReconnect(false);
        goToStep(4);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
      return;
    }
  }

  /* ─── Render step 4 : sélecteur plan + promo ─────────────── */
  function renderSubscriptionStep() {
    const isAnnual = selectedBilling === "annual";

    /* Calcul du prix total */
    const basePrice = selectedTier === "free"
      ? 0
      : (isAnnual ? ANNUAL_PRICES[selectedTier as Exclude<PlanTier, "free">] : MONTHLY_PRICES[selectedTier as Exclude<PlanTier, "free">]);
    const addonPrice = multiArtists === "small" ? 30 : multiArtists === "large" ? 60 : 0;
    const totalPrice = basePrice + addonPrice;

    if (abonnementNeedsReconnect) {
      return (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 space-y-4">
          <p className="text-sm text-blue-200">
            Session expirée ou introuvable. Reconnectez-vous avec le même email et mot de passe pour enregistrer votre carte.
          </p>
          <Button type="button" className="w-full" onClick={() => { setAbonnementNeedsReconnect(false); setError(null); goToStep(0); }}>
            Retour à l&apos;étape Compte
          </Button>
        </div>
      );
    }

    if (promoChoice !== null) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-zinc-400">Redirection vers le paiement sécurisé…</p>
        </div>
      );
    }

    /* ── Données des plans ── */
    const plans: Array<{
      tier: PlanTier;
      label: string;
      price: number;
      badge?: string;
      features: Array<{ text: string; included: boolean }>;
    }> = [
      {
        tier: "free",
        label: "Gratuit",
        price: 0,
        features: [
          { text: "Profil public basique", included: true },
          { text: "Suivi clients", included: true },
          { text: "Suivi matériel", included: true },
          { text: "IA rédaction", included: false },
          { text: "Stats avancées", included: false },
          { text: "Zones tarifaires", included: false },
          { text: "Bannière animée", included: false },
        ],
      },
      {
        tier: "starter",
        label: "Starter",
        price: isAnnual ? 220 : 22,
        features: [
          { text: "Profil public", included: true },
          { text: "Suivi clients + matériel", included: true },
          { text: "IA rédaction (GPT-3.5)", included: true },
          { text: "Zones tarifaires", included: true },
          { text: "Parrainage clients", included: true },
          { text: "Stats avancées", included: false },
          { text: "Bannière animée", included: false },
        ],
      },
      {
        tier: "pro",
        label: "Pro",
        price: isAnnual ? 270 : 27,
        badge: "Populaire",
        features: [
          { text: "Profil public", included: true },
          { text: "Suivi clients + matériel", included: true },
          { text: "IA rédaction (GPT-4o mini)", included: true },
          { text: "Zones tarifaires", included: true },
          { text: "Parrainage clients", included: true },
          { text: "Stats avancées", included: true },
          { text: "Bannière animée", included: true },
        ],
      },
      {
        tier: "premium",
        label: "Premium",
        price: isAnnual ? 300 : 30,
        badge: "✦ Recommandé",
        features: [
          { text: "Profil public", included: true },
          { text: "Suivi clients + matériel", included: true },
          { text: "IA rédaction (GPT-4o)", included: true },
          { text: "Zones tarifaires", included: true },
          { text: "Parrainage clients", included: true },
          { text: "Stats avancées", included: true },
          { text: "Bannière animée + tampon", included: true },
        ],
      },
    ];

    return (
      <div className="space-y-5">
        {/* Toggle mensuel / annuel */}
        <div className="grid grid-cols-2 gap-2">
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBilling(b)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedBilling === b
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {b === "monthly" ? (
                "Mensuel"
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Annuel
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                    2 mois offerts
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Cards des 4 plans */}
        <div className="grid grid-cols-2 gap-2">
          {plans.map((plan) => {
            const isSelected = selectedTier === plan.tier;
            const isFree = plan.tier === "free";
            return (
              <button
                key={plan.tier}
                type="button"
                onClick={() => setSelectedTier(plan.tier)}
                className={`relative rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 hover:border-zinc-500"
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    plan.tier === "premium"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-zinc-700 text-zinc-300"
                  }`}>
                    {plan.badge}
                  </span>
                )}
                <div className="mb-2 mt-0.5">
                  <span className={`text-sm font-bold ${isSelected ? "text-blue-200" : "text-zinc-700 dark:text-zinc-200"}`}>
                    {plan.label}
                  </span>
                </div>
                <div className="mb-2.5 flex items-baseline gap-1">
                  <span className="text-xl font-bold tabular-nums leading-none">
                    {isFree ? "0" : plan.price}
                  </span>
                  <span className="text-xs text-zinc-500">€{isAnnual && !isFree ? "/an" : "/mois"}</span>
                </div>
                <ul className="space-y-1">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className={`flex items-start gap-1.5 text-[11px] leading-tight ${
                      f.included ? "text-zinc-300" : "text-zinc-600 line-through"
                    }`}>
                      <span className={`mt-0.5 shrink-0 text-[10px] ${f.included ? "text-emerald-400" : "text-zinc-700"}`}>
                        {f.included ? "✓" : "✕"}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Add-on multi-artistes */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Option multi-tatoueurs <span className="font-normal normal-case text-zinc-600">(salon ou collectif)</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["none", "small", "large"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMultiArtists(opt)}
                className={`rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition-colors ${
                  multiArtists === opt
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {opt === "none" && (
                  <>
                    <span className="block font-semibold text-sm">Solo</span>
                    <span className="text-[11px] text-zinc-500">1 tatoueur</span>
                  </>
                )}
                {opt === "small" && (
                  <>
                    <span className="block font-semibold text-sm">+30 €</span>
                    <span className="text-[11px] text-zinc-500">2–3 tatoueurs</span>
                  </>
                )}
                {opt === "large" && (
                  <>
                    <span className="block font-semibold text-sm">+60 €</span>
                    <span className="text-[11px] text-zinc-500">4+ tatoueurs</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Résumé du total */}
        {selectedTier !== "free" && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[32px] font-bold tabular-nums leading-none">
                  {isAnnual ? totalPrice : totalPrice}
                </span>
                <span className="ml-1 text-base text-zinc-400">€</span>
                <span className="ml-1 text-sm text-zinc-500">/ {isAnnual ? "an" : "mois"}</span>
              </div>
              <div className="text-right text-xs text-zinc-500">
                {multiArtists !== "none" && (
                  <span className="block">
                    {MONTHLY_PRICES[selectedTier as Exclude<PlanTier, "free">]} € + {addonPrice} € add-on
                  </span>
                )}
                {isAnnual && (
                  <span className="block text-blue-400">
                    ≈ {Math.round(totalPrice / 10)} €/mois · 2 mois offerts
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Code de parrainage */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-zinc-500 mb-1.5">
            Code de parrainage <span className="normal-case font-normal text-zinc-600">(optionnel)</span>
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().slice(0, 12);
                setReferralCode(v);
                setReferralValid(null);
              }}
              onBlur={() => void validateReferralCodeInput(referralCode)}
              placeholder="Ex : AB3XK7PQ"
              maxLength={12}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-2 text-sm font-mono tracking-wider text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {referralChecking && <span className="text-xs text-zinc-500">Vérification…</span>}
            {!referralChecking && referralValid === true && (
              <span className="text-xs text-green-400 font-medium">✓ 1 mois offert</span>
            )}
            {!referralChecking && referralValid === false && referralCode.length > 0 && (
              <span className="text-xs text-red-400">Code invalide</span>
            )}
          </div>
        </div>

        {/* Boutons CTA */}
        {selectedTier === "free" ? (
          <Button type="button" className="w-full" onClick={() => goToStep(5)} disabled={loading}>
            Continuer gratuitement →
          </Button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setPromoChoice(false); void startCheckout(false); }}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                `Passer au paiement · ${totalPrice} €/${isAnnual ? "an" : "mois"}`
              )}
            </button>
            <button
              type="button"
              onClick={() => goToStep(5)}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-60"
            >
              Passer cette étape →
            </button>
          </div>
        )}
      </div>
    );
  }


  /* ─── Écran final ────────────────────────────────────────── */
  if (done) {
    const profileSlug = slug.trim();
    const profilePath = SLUG_PATTERN.test(profileSlug) ? `/ink/${profileSlug}` : null;

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">Bienvenue sur Retvy !</h2>
          <p className="mt-2 text-zinc-500">
            {profilePath ? (
              <>Votre profil <span className="text-blue-400">{profilePath}</span> est prêt.</>
            ) : (
              "Votre espace pro est prêt."
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {profilePath ? (
              <Link href={profilePath} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/50 px-5 py-2.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/10">
                Voir mon profil
              </Link>
            ) : null}
            <Button type="button" onClick={goToProDashboard}>Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ─── Wizard principal ───────────────────────────────────── */
  return (
    <Card>
      <CardHeader>
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className={`flex flex-1 flex-col items-center gap-1 text-xs ${i <= step ? "text-blue-400" : "text-zinc-600"}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${i < step ? "border-blue-500 bg-blue-500/20" : i === step ? "border-blue-500" : "border-zinc-300 dark:border-zinc-700"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="hidden sm:block">{label}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {envError && <p className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-300">{envError}</p>}
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Prénom</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Nom</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Email pro</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Mot de passe</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Nom d&apos;artiste *</label>
              <Input value={artistName} onChange={(e) => { setArtistName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required />
            </div>
            <ProAddressFields
              layout="stack"
              address={address} city={city} postalCode={postalCode}
              onAddressChange={setAddress} onCityChange={setCity} onPostalCodeChange={setPostalCode}
              addressRequired cityRequired disabled={loading}
            />
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Téléphone *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
        )}

        {step === 2 && <ProStylePicker value={styleSelection} onChange={setStyleSelection} disabled={loading} />}

        {step === 3 && (
          <div className="space-y-2">
            <label className="block text-sm text-zinc-400">URL publique /ink/</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">/ink/</span>
              <Input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
            </div>
            <p className="text-xs text-zinc-500">
              {slugState === "checking" && "Vérification…"}
              {slugState === "available" && <span className="text-emerald-400">Disponible</span>}
              {slugState === "taken" && <span className="text-red-400">Déjà pris</span>}
              {slugState === "invalid" && slug.length > 0 && <span className="text-red-400">3–32 caractères, a-z et 0-9</span>}
            </p>
          </div>
        )}

        {step === 4 && renderSubscriptionStep()}

        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
              <div className="flex gap-4">
                <Banknote className="h-6 w-6 shrink-0 text-blue-400" />
                <div>
                  <h3 className="font-medium">Stripe Connect</h3>
                  <p className="mt-1 text-sm text-zinc-500">Recevez les acomptes clients directement sur votre compte.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void connectStripe()} disabled={loading} size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" />Connecter Stripe</>}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void finalize()} disabled={loading}>
                      Terminer plus tard
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => { setError(null); goToStep(Math.max(0, step - 1)); }} disabled={step === 0 || loading || !!envError}>
              Retour
            </Button>
            <Button type="button" onClick={() => void handleNext()} disabled={loading || !!envError}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : step === 3 ? "Créer mon compte pro" : "Continuer"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
