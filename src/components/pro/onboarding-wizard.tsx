"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CITIES, TATTOO_STYLES } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Banknote, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";

const STEPS = ["Compte", "Infos", "Styles", "Slug", "Abonnement", "Stripe"] as const;
type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

export function OnboardingWizard() {
  const router = useRouter();
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
    const sub = searchParams.get("sub");
    const sessionId = searchParams.get("session_id");
    const connect = searchParams.get("connect");

    if (sub === "ok" && sessionId) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/stripe/checkout/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? "Confirmation échouée");
          }
          setStep(5);
          window.history.replaceState({}, "", "/pro/inscription");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erreur");
        } finally {
          setLoading(false);
        }
      })();
    } else if (sub === "ok") {
      setStep(5);
    }

    if (connect === "done") {
      setStep(5);
      setDone(true);
      window.history.replaceState({}, "", "/pro/inscription");
    }
  }, [searchParams]);

  function toggleStyle(style: string) {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
    );
  }

  async function ensureSession() {
    const supabase = createClient();
    const { data: signData, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/pro/inscription`,
        data: { first_name: firstName, last_name: lastName, phone },
      },
    });

    if (signErr) {
      const msg = signErr.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (siErr) throw new Error("Compte existant — mot de passe incorrect.");
      } else {
        throw signErr;
      }
    } else if (!signData.session) {
      const { error: siErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (siErr) {
        throw new Error(
          "Confirmez votre email puis reconnectez-vous.",
        );
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("Session non établie.");
  }

  async function createProfile() {
    const res = await fetch("/api/pro/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erreur profil");
  }

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: `${firstName} ${lastName}`.trim() || artistName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur Stripe");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  async function connectStripe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur Stripe");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  async function finalize() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("pro_profiles")
          .update({ status: "active" })
          .eq("user_id", user.id);
      }
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
      setStep(1);
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
      setLoading(true);
      try {
        await ensureSession();
        await createProfile();
        setStep(4);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">Bienvenue sur Retvy !</h2>
          <p className="mt-2 text-zinc-500">
            Votre profil{" "}
            <span className="text-amber-400">/ink/{slug}</span> est prêt.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/ink/${slug}`}>
              <Button variant="outline">Voir mon profil</Button>
            </Link>
            <Button onClick={() => router.push("/pro/dashboard")}>
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
                i <= step ? "text-amber-400" : "text-zinc-600"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  i < step
                    ? "border-amber-500 bg-amber-500/20"
                    : i === step
                      ? "border-amber-500"
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
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
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
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
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
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100">Aucun débit pendant 2 mois.</strong>{" "}
                  Carte enregistrée pour l&apos;abonnement pro Retvy après la période
                  d&apos;essai. Annulation en 1 clic.
                </p>
              </div>
            </div>
            <Button onClick={startCheckout} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enregistrer ma carte (essai 60 jours)"
              )}
            </Button>
            <Button
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
                <Banknote className="h-6 w-6 shrink-0 text-amber-400" />
                <div>
                  <h3 className="font-medium">Stripe Connect</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Recevez les acomptes clients directement sur votre compte.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={connectStripe} disabled={loading} size="sm">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Connecter Stripe
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={finalize} disabled={loading}>
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
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || loading}
            >
              Retour
            </Button>
            <Button onClick={handleNext} disabled={loading}>
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
