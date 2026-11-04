"use client";

import { useState, useEffect } from "react";
import { Check, Heart, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface HealthProfile {
  height_cm: number | null;
  weight_kg: number | null;
  birth_year: number | null;
  has_conditions: boolean;
  conditions_note: string | null;
}

function calcAge(birthYear: number | null): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

export function ClientHealthProfileForm({ userId }: { userId: string }) {
  const supabase = createClient();

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [hasConditions, setHasConditions] = useState(false);
  const [conditionsNote, setConditionsNote] = useState("");

  useEffect(() => {
    supabase
      .from("client_health_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setHeightCm(data.height_cm?.toString() ?? "");
        setWeightKg(data.weight_kg?.toString() ?? "");
        setBirthYear(data.birth_year?.toString() ?? "");
        setHasConditions(data.has_conditions ?? false);
        setConditionsNote(data.conditions_note ?? "");
      });
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: HealthProfile = {
      height_cm: heightCm ? parseInt(heightCm, 10) : null,
      weight_kg: weightKg ? parseInt(weightKg, 10) : null,
      birth_year: birthYear ? parseInt(birthYear, 10) : null,
      has_conditions: hasConditions,
      conditions_note: hasConditions ? conditionsNote.trim() || null : null,
    };

    const { error: err } = await supabase
      .from("client_health_profiles")
      .upsert(
        { user_id: userId, ...payload, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    setSaving(false);
    if (err) {
      setError("Erreur lors de la sauvegarde. Réessayez.");
    } else {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  const age = calcAge(birthYear ? parseInt(birthYear, 10) : null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-400 shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">
            Fiche santé
          </p>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Ces informations sont confidentielles et aident votre tatoueur à préparer votre séance en toute sécurité.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
          {/* Taille / Poids */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Taille (cm)
              </label>
              <input
                type="number"
                min={100}
                max={250}
                placeholder="ex. 172"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Poids (kg)
              </label>
              <input
                type="number"
                min={30}
                max={300}
                placeholder="ex. 68"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Année de naissance */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Année de naissance
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1920}
                max={new Date().getFullYear() - 18}
                placeholder="ex. 1995"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-32 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {age !== null && (
                <span className="text-sm text-zinc-500">
                  →{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {age} ans
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Maladie */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Maladie ou contre-indication connue ?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setHasConditions(false)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  !hasConditions
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                Non
              </button>
              <button
                type="button"
                onClick={() => setHasConditions(true)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  hasConditions
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                Oui
              </button>
            </div>

            {hasConditions && (
              <div className="mt-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 mb-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Votre tatoueur prendra en compte ces informations. En cas de
                    doute, consultez votre médecin avant la séance.
                  </p>
                </div>
                <textarea
                  rows={3}
                  placeholder="Précisez (ex : diabète, traitement anticoagulant, allergie aux encres…)"
                  value={conditionsNote}
                  onChange={(e) => setConditionsNote(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#0057FF] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer la fiche"}
          </button>

          {saved && (
            <p className="flex items-center gap-2 text-sm text-emerald-400 justify-center">
              <Check className="h-4 w-4" /> Fiche mise à jour
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
