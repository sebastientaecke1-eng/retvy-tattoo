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
import { CITIES, TATTOO_STYLES } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Banknote, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";

const STEPS = ["Compte", "Infos", "Styles", "Slug", "Abonnement", "Stripe"] as const;
const ONBOARDING_STEP_KEY = "retvy:pro-onboarding:step";
const ONBOARDING_SLUG_KEY = "retvy:pro-onboarding:slug";
const MAX_STEP = STEPS.length - 1;
const SLUG_PATTERN = /^[a-z0-9]{3,32}$/;

function readStoredSlug(): string {
  try {
    return sessionStorage.getItem(ONBOARDING_SLUG_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function rememberSlug(value: string) {
  try {
    if (SLUG_PATTERN.test(value)) {
      sessionStorage.setItem(ONBOARDING_SLUG_KEY, value);
    }
  } catch {
    /* ignore */
  }
}
type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

type StoredSession = {
  access_token: string;
  refresh_token: string;
};

type EstablishSessionResult = {
  session: Session | null;
  pendingEmail: boolean;
};

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
  const [city, setCity] = useState("Paris");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [styles, setStyles] = useState<string[]>([]);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [envError, setEnvError] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [abonnementNeedsReconnect, setAbonnementNeedsReconnect] = useState(false);
  /** Session établie à l'étape Compte (cookies Supabase + repli mémoire). */
  const [authSession, setAuthSession] = useState<Session | null>(null);
  /** Ref stable pour requireSession (évite perte entre étapes). */
  const authSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    setEnvError(getBrowserSupabaseEnvError());
    const storedSlug = readStoredSlug();
    if (storedSlug) setSlug(storedSlug);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ONBOARDING_STEP_KEY);
      if (raw == null) return;
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0 && n <= MAX_STEP) {
        setStep(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(ONBOARDING_STEP_KEY, String(step));
    } catch {
      /* ignore */
    }
  }, [step]);

  const checkSlug = useCallback(async (value: string) => {
    if (!/^[a-z0-9]{3,32}$/.test(value)) {
      setSlugState("invalid");
      return;
    }
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
    if (slugState === "available" && SLUG_PATTERN.test(slug.trim())) {
      rememberSlug(slug.trim());
    }
  }, [slug, slugState]);

  useEffect(() => {
    if (!done) return;
    const current = (slug.trim() || readStoredSlug()).trim();
    if (SLUG_PATTERN.test(current)) return;

    const supabase = createClientOrNull();
    if (!supabase) return;

    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("pro_profiles")
        .select("slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.slug && SLUG_PATTERN.test(data.slug)) {
        setSlug(data.slug);
        rememberSlug(data.slug);
      }
    });
  }, [done, slug]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam != null) {
      const n = Number.parseInt(stepParam, 10);
      if (Number.isFinite(n) && n >= 0 && n <= MAX_STEP) {
        setStep(n);
      }
    }

    if (searchParams.get("sub") === "error") {
      setError("La confirmation du paiement a échoué. Réessayez l'abonnement.");
      setStep(4);
    }
  }, [searchParams]);

  function isAlreadyRegistered(message: string): boolean {
    const m = message.toLowerCase();
    return (
      m.includes("already") ||
      m.includes("registered") ||
      m.includes("exists") ||
      m.includes("duplicate")
    );
  }

  function toggleStyle(style: string) {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
    );
  }

  const readStoredSession = useCallback(
    (): StoredSession | null => readOnboardingStoredSession(),
    [],
  );

  const rememberSession = useCallback((session: Session | null) => {
    if (!session) return;
    authSessionRef.current = session;
    setAuthSession(session);
    try {
      sessionStorage.setItem(
        ONBOARDING_SESSION_KEY,
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        } satisfies StoredSession),
      );
    } catch {
      /* quota / mode privé */
    }
  }, []);

  const syncSessionToClient = useCallback(
    async (session: Session | StoredSession): Promise<Session | null> => {
      const supabase = createClientOrNull();
      if (!supabase) return null;

      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        console.warn("[onboarding] setSession:", error.message);
        if ("user" in session && session.user) {
          rememberSession(session as Session);
          return session as Session;
        }
        return null;
      }

      const active = data.session;
      if (active) rememberSession(active);
      return active;
    },
    [rememberSession],
  );

  const restoreSessionFromStorage = useCallback(async (): Promise<Session | null> => {
    const active = await restoreSessionFromOnboardingStorage();
    if (active) rememberSession(active);
    return active;
  }, [rememberSession]);

  useEffect(() => {
    void restoreSessionFromStorage();
  }, [restoreSessionFromStorage]);

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
          setError(
            "Session expirée après le paiement. Reconnectez-vous avec le même email (étape Compte) pour accéder au dashboard.",
          );
          if (sub === "ok") setStep(4);
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

        const storedSlug = readStoredSlug();
        if (storedSlug) setSlug(storedSlug);

        if (sub === "ok") {
          setStep(5);
          setDone(true);
          window.history.replaceState({}, "", "/pro/inscription?step=5&sub=ok");
        } else if (connect === "done") {
          setStep(5);
          setDone(true);
          window.history.replaceState({}, "", "/pro/inscription?step=5");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
        if (sub === "ok") setStep(4);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, restoreSessionFromStorage]);

  async function signInWithPassword() {
    const supabase = createClientOrNull();
    if (!supabase) {
      throw new Error(
        getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials")) {
        throw new Error("Mot de passe incorrect pour cet email.");
      }
      throw new Error(error.message);
    }
    if (!data.session) throw new Error("Session non établie après connexion.");
    return (await syncSessionToClient(data.session)) ?? data.session;
  }

  /** Crée le compte + session à l'étape Compte. */
  async function establishSession(): Promise<EstablishSessionResult> {
    const supabase = createClientOrNull();
    if (!supabase) {
      throw new Error(
        getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
      );
    }

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

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin;
    const emailRedirectTo = `${appUrl}/api/auth/callback?next=${encodeURIComponent("/pro/inscription")}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          first_name: firstName,
          last_name: lastName,
          role: "pro",
          ...(phone ? { phone } : {}),
        },
      },
    });

    if (error) {
      if (isAlreadyRegistered(error.message)) {
        setEmailPending(false);
        const session = await signInWithPassword();
        return { session, pendingEmail: false };
      }
      throw new Error(error.message);
    }

    if (data.user?.identities?.length === 0) {
      setEmailPending(false);
      const session = await signInWithPassword();
      return { session, pendingEmail: false };
    }

    if (!data.session) {
      setEmailPending(true);
      return { session: null, pendingEmail: true };
    }

    setEmailPending(false);
    const session = await syncSessionToClient(data.session);
    return { session: session ?? data.session, pendingEmail: false };
  }

  /** À l'étape Slug : réutilise la session ou reconnecte avec email/mot de passe. */
  async function requireSession(): Promise<Session> {
    const supabase = createClientOrNull();
    if (!supabase) {
      throw new Error(
        getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
      );
    }

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

    throw new Error(
      "Session expirée. Revenez à l'étape Compte et reconnectez-vous avec le même email et mot de passe.",
    );
  }

  function apiAuthHeaders(session?: Session | null): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token =
      session?.access_token ?? authSessionRef.current?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function createProfile(session: Session) {
    const res = await fetch("/api/pro/profile", {
      method: "POST",
      headers: apiAuthHeaders(session),
      credentials: "include",
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        artist_name: artistName,
        studio: studio || null,
        city,
        address: address || null,
        phone,
        styles,
        slug,
      }),
    });
    const data = (await res.json()) as { error?: string; slug?: string };
    if (!res.ok) throw new Error(data.error ?? "Erreur profil");
    const savedSlug = (data.slug ?? slug).trim();
    if (savedSlug) {
      setSlug(savedSlug);
      rememberSlug(savedSlug);
    }
  }

  async function startCheckout() {
    setLoading(true);
    setError(null);
    setAbonnementNeedsReconnect(false);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError(
        getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
      );
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setAbonnementNeedsReconnect(true);
      setLoading(false);
      return;
    }

    rememberSession(session);

    const checkoutEmail = email.trim() || session.user.email || "";
    const checkoutName =
      `${firstName} ${lastName}`.trim() || artistName.trim() || "Pro Retvy";

    const supabaseFunctionsBase = getPublicSupabaseUrl().replace(/\/$/, "");
    const checkoutUrl = `${supabaseFunctionsBase}/functions/v1/stripe-checkout`;

    try {
      const res = await fetch(checkoutUrl, {
        method: "POST",
        headers: {
          ...apiAuthHeaders(session),
          apikey: getPublicSupabaseAnonKey(),
        },
        body: JSON.stringify({
          email: checkoutEmail,
          name: checkoutName,
          userId: session.user.id,
        }),
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur Stripe");
      }
      if (!data.url) {
        throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  async function connectStripe() {
    setLoading(true);
    setError(null);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError(
        getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
      );
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError(
        "Session expirée. Retournez à l'étape Compte pour vous reconnecter.",
      );
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
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur Stripe Connect");
      }
      if (!data.url) {
        throw new Error("Stripe n'a pas renvoyé d'URL Connect.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  function goToProDashboard() {
    window.location.href = "/pro/dashboard";
  }

  async function finalize() {
    setLoading(true);
    try {
      const supabase = createClientOrNull();
      if (!supabase) {
        throw new Error(
          getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
        );
      }
      const session = await requireSession();
      await supabase
        .from("pro_profiles")
        .update({ status: "active" })
        .eq("user_id", session.user.id);
      rememberSlug(slug.trim() || readStoredSlug());
      setDone(true);
      try {
        sessionStorage.removeItem(ONBOARDING_STEP_KEY);
      } catch {
        /* ignore */
      }
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
        if (!session && pendingEmail) {
          setStep(1);
          return;
        }
        if (!session?.access_token) {
          throw new Error(
            "Session non établie après inscription. Réessayez ou connectez-vous.",
          );
        }
        setStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 1) {
      if (!artistName || !city || !phone) {
        setError("Nom d'artiste, ville et téléphone requis.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (styles.length === 0) {
        setError("Sélectionnez au moins un style.");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (slugState !== "available") {
        setError("Choisissez un slug disponible.");
        return;
      }
      if (emailPending) {
        setError(
          "Confirmez d'abord votre email (lien reçu par mail), puis revenez créer votre slug.",
        );
        return;
      }
      setLoading(true);
      try {
        const session = await requireSession();
        if (!session.access_token) {
          throw new Error("Session invalide. Reconnectez-vous à l'étape Compte.");
        }
        await createProfile(session);
        setError(null);
        setAbonnementNeedsReconnect(false);
        setStep(4);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
      return;
    }
  }

  if (done) {
    const profileSlug = (slug.trim() || readStoredSlug()).trim();
    const profilePath = SLUG_PATTERN.test(profileSlug)
      ? `/ink/${profileSlug}`
      : null;

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">Bienvenue sur Retvy !</h2>
          <p className="mt-2 text-zinc-500">
            {profilePath ? (
              <>
                Votre profil{" "}
                <span className="text-blue-400">{profilePath}</span> est prêt.
              </>
            ) : (
              "Votre espace pro est prêt."
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {profilePath ? (
              <Link
                href={profilePath}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/50 px-5 py-2.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/10"
              >
                Voir mon profil
              </Link>
            ) : null}
            <Button type="button" onClick={goToProDashboard}>
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex flex-1 flex-col items-center gap-1 text-xs ${
                i <= step ? "text-blue-400" : "text-zinc-600"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  i < step
                    ? "border-blue-500 bg-blue-500/20"
                    : i === step
                      ? "border-blue-500"
                      : "border-zinc-700"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="hidden sm:block">{label}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {envError && (
          <p className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-300">
            {envError}
          </p>
        )}
        {emailPending && (
          <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
            Un email de confirmation vous a été envoyé par Supabase. Validez-le
            avant l&apos;étape finale (création du profil).
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

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
              <Input
                value={artistName}
                onChange={(e) => {
                  setArtistName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Studio</label>
              <Input value={studio} onChange={(e) => setStudio(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Ville *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Adresse</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Téléphone *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {TATTOO_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  styles.includes(style)
                    ? "border-blue-500 bg-blue-500/15 text-blue-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <label className="block text-sm text-zinc-400">URL publique /ink/</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">/ink/</span>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {slugState === "checking" && "Vérification…"}
              {slugState === "available" && <span className="text-emerald-400">Disponible</span>}
              {slugState === "taken" && <span className="text-red-400">Déjà pris</span>}
              {slugState === "invalid" && slug.length > 0 && (
                <span className="text-red-400">3–32 caractères, a-z et 0-9</span>
              )}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {abonnementNeedsReconnect ? (
              <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 space-y-4">
                <p className="text-sm text-blue-200">
                  Session expirée ou introuvable. Reconnectez-vous avec le même
                  email et mot de passe pour enregistrer votre carte.
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setAbonnementNeedsReconnect(false);
                    setError(null);
                    setStep(0);
                  }}
                >
                  Retour à l&apos;étape Compte
                </Button>
              </div>
            ) : (
              <>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100">Aucun débit pendant 30 jours.</strong>{" "}
                  Carte enregistrée pour l&apos;abonnement pro Retvy après la période
                  d&apos;essai. Annulation en 1 clic.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void startCheckout()}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enregistrer ma carte (essai 30 jours)"
              )}
            </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep(5)}
              disabled={loading}
            >
              Passer cette étape →
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex gap-4">
                <Banknote className="h-6 w-6 shrink-0 text-blue-400" />
                <div>
                  <h3 className="font-medium">Stripe Connect</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Recevez les acomptes clients directement sur votre compte.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void connectStripe()}
                      disabled={loading}
                      size="sm"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Connecter Stripe
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void finalize()}
                      disabled={loading}
                    >
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || loading || !!envError}
            >
              Retour
            </Button>
            <Button
              type="button"
              onClick={() => void handleNext()}
              disabled={loading || !!envError}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 3 ? (
                "Créer mon compte pro"
              ) : (
                "Continuer"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
