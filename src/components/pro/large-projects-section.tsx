"use client";

import { useState, useEffect, useCallback } from "react";
import type { PlanTier } from "@/lib/stripe/plans";
import { hasFeature } from "@/lib/stripe/plans";
import {
  Layers, Bot, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  CheckCircle, Clock, XCircle, Save, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LargeProjectStage {
  id: string;
  label: string;
  durationHours: number;
  notes: string;
}

interface LargeProjectConfig {
  enabled: boolean;
  defaultMinGapWeeks: number;
  sessionTemplate: LargeProjectStage[];
  aiInstructions: string;
}

type Session = {
  id: string;
  session_number: number;
  status: "planned" | "done" | "missed";
  session_date: string | null;
  zone: string | null;
  notes: string | null;
};

type Project = {
  id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  total_sessions_planned: number;
  status: "in_progress" | "completed" | "cancelled" | "paused";
  description: string | null;
  notes: string | null;
  created_at: string;
  pro_large_project_sessions: Session[];
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LargeProjectConfig = {
  enabled: true,
  defaultMinGapWeeks: 6,
  sessionTemplate: [
    { id: "1", label: "Tracé / Dessin", durationHours: 2, notes: "" },
    { id: "2", label: "Remplissage", durationHours: 3, notes: "" },
    { id: "3", label: "Ombrages", durationHours: 2, notes: "" },
    { id: "4", label: "Finitions / Retouches", durationHours: 1.5, notes: "" },
  ],
  aiInstructions: "",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_progress: { label: "En cours", color: "bg-blue-950/50 text-blue-400" },
  completed: { label: "Terminé", color: "bg-emerald-950/50 text-emerald-400" },
  paused: { label: "En pause", color: "bg-amber-950/50 text-amber-400" },
  cancelled: { label: "Annulé", color: "bg-red-950/50 text-red-400" },
};

const SESSION_STATUS_ICON = {
  planned: <Clock className="h-3.5 w-3.5 text-zinc-500" />,
  done: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  missed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
};

// ─── Carte projet détecté ────────────────────────────────────────────────────

function ProjectCard({ project, onUpdate }: { project: Project; onUpdate: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const done = project.pro_large_project_sessions.filter((s) => s.status === "done").length;
  const total = project.total_sessions_planned;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const st = STATUS_LABELS[project.status] ?? STATUS_LABELS.in_progress;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-100/30 dark:bg-zinc-800/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{project.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.color}`}>{st.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{project.client_name} · {done}/{total} séances</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-zinc-500">{pct}%</span>
          {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-3">
          {project.description && <p className="text-xs text-zinc-400">{project.description}</p>}
          <div className="space-y-1.5">
            {project.pro_large_project_sessions
              .sort((a, b) => a.session_number - b.session_number)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  {SESSION_STATUS_ICON[s.status]}
                  <span className="text-zinc-400">Séance {s.session_number}</span>
                  {s.session_date && <span className="text-zinc-600">— {new Date(s.session_date).toLocaleDateString("fr-FR")}</span>}
                  {s.zone && <span className="rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-500">{s.zone}</span>}
                </div>
              ))}
          </div>
          {project.notes && (
            <p className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-500">{project.notes}</p>
          )}
          {project.status === "in_progress" && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => onUpdate(project.id, "completed")}>
                <CheckCircle className="h-3 w-3 mr-1" />Marquer terminé
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => onUpdate(project.id, "paused")}>
                <Clock className="h-3 w-3 mr-1" />Mettre en pause
              </Button>
            </div>
          )}
          {project.status !== "in_progress" && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => onUpdate(project.id, "in_progress")}>
              Reprendre
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function LargeProjectsSection({ subscriptionTier = "free" }: { subscriptionTier?: PlanTier }) {
  const canUse = hasFeature(subscriptionTier, "hasLargeProjectsAI");

  // Config IA
  const [config, setConfig] = useState<LargeProjectConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Projets détectés
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Drag state pour réordonner les étapes
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // ── Chargement ────────────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/pro/large-projects/config");
      if (res.ok) {
        const data = await res.json() as { config: LargeProjectConfig };
        setConfig(data.config);
      }
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/pro/large-projects");
      if (res.ok) {
        const data = await res.json() as { projects: Project[] };
        setProjects(data.projects ?? []);
      }
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUse) { setConfigLoading(false); setProjectsLoading(false); return; }
    void loadConfig();
    void loadProjects();
  }, [canUse, loadConfig, loadProjects]);

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  async function saveConfig() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/pro/large-projects/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json() as { error?: string };
        setSaveError(d.error ?? "Erreur lors de la sauvegarde");
      }
    } catch {
      setSaveError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  // ── Gestion des étapes ────────────────────────────────────────────────────

  function addStage() {
    const newStage: LargeProjectStage = {
      id: Date.now().toString(),
      label: "",
      durationHours: 2,
      notes: "",
    };
    setConfig((c) => ({ ...c, sessionTemplate: [...c.sessionTemplate, newStage] }));
  }

  function removeStage(id: string) {
    setConfig((c) => ({ ...c, sessionTemplate: c.sessionTemplate.filter((s) => s.id !== id) }));
  }

  function updateStage(id: string, field: keyof LargeProjectStage, value: string | number) {
    setConfig((c) => ({
      ...c,
      sessionTemplate: c.sessionTemplate.map((s) => s.id === id ? { ...s, [field]: value } : s),
    }));
  }

  function moveStage(from: number, to: number) {
    if (from === to) return;
    setConfig((c) => {
      const arr = [...c.sessionTemplate];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...c, sessionTemplate: arr };
    });
  }

  // ── Projets ───────────────────────────────────────────────────────────────

  async function updateProjectStatus(id: string, status: string) {
    const res = await fetch("/api/pro/large-projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const d = await res.json() as { project: Project };
      setProjects((p) => p.map((proj) => proj.id === id ? { ...proj, status: d.project.status } : proj));
    }
  }

  // ── Render — paywall ─────────────────────────────────────────────────────

  if (!canUse) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-5 w-5 text-zinc-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Grands projets multi-séances</h2>
          <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-400">Premium</span>
        </div>
        <p className="text-xs text-zinc-500">
          Disponible avec le plan Premium (30 EUR/mois). L&apos;IA détecte automatiquement dans le tchat
          quand un client souhaite un tatouage en plusieurs séances, et propose un planning basé sur
          votre configuration.
        </p>
      </div>
    );
  }

  const active = projects.filter((p) => p.status === "in_progress" || p.status === "paused");
  const archived = projects.filter((p) => p.status === "completed" || p.status === "cancelled");

  // ── Render principal ──────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Section configuration IA ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-5 space-y-5">

        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Configuration — Détection IA des grands projets
            </h2>
          </div>
<button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
              config.enabled ? "bg-[#0057FF]" : "bg-gray-200 dark:bg-zinc-700"
            }`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
              config.enabled ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {/* Explication */}
        <div className="flex gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gray-100/30 dark:bg-zinc-800/30 px-3 py-2.5">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400">
            Quand activé, l&apos;IA détecte dans le tchat qu&apos;un client souhaite un grand projet
            (tatouage complet, dos, manga…) et lui propose automatiquement un planning de séances
            basé sur la séquence ci-dessous.
          </p>
        </div>

        {configLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
          </div>
        ) : (
          <>
            {/* ── Séquence de séances ───────────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Séquence de séances
              </p>
              <p className="text-xs text-zinc-600">
                Définissez l&apos;ordre et la durée estimée de chaque étape. L&apos;IA s&apos;en servira pour planifier les RDV.
              </p>

              <div className="space-y-2 mt-2">
                {config.sessionTemplate.map((stage, idx) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
                    onDrop={() => {
                      if (dragIdx !== null) moveStage(dragIdx, idx);
                      setDragIdx(null); setOverIdx(null);
                    }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                    className={`rounded-xl border bg-gray-100/40 dark:bg-zinc-800/40 p-3 transition-all ${
                      overIdx === idx ? "border-blue-500/60" : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Drag handle + numéro */}
                      <div className="flex items-center gap-1.5 pt-1 cursor-grab shrink-0">
                        <GripVertical className="h-4 w-4 text-zinc-600" />
                        <span className="text-xs font-bold text-zinc-600 w-4 text-center">{idx + 1}</span>
                      </div>

                      {/* Champs */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex gap-2 flex-wrap">
                          <input
                            className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Nom de l'étape (ex: Tracé)"
                            value={stage.label}
                            onChange={(e) => updateStage(stage.id, "label", e.target.value)}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min={0.5}
                              max={12}
                              step={0.5}
                              className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={stage.durationHours}
                              onChange={(e) => updateStage(stage.id, "durationHours", parseFloat(e.target.value) || 1)}
                            />
                            <span className="text-xs text-zinc-500 whitespace-nowrap">h estimées</span>
                          </div>
                        </div>
                        <input
                          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Notes pour l'IA (optionnel)"
                          value={stage.notes}
                          onChange={(e) => updateStage(stage.id, "notes", e.target.value)}
                        />
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => removeStage(stage.id)}
                        className="mt-1 shrink-0 rounded p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Supprimer cette étape"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addStage}
                className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:border-blue-500/60 hover:text-blue-400 transition-colors w-full justify-center"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une étape
              </button>
            </div>

            {/* ── Délai minimum entre séances ───────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Délai minimum entre deux séances
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={52}
                  className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={config.defaultMinGapWeeks}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, defaultMinGapWeeks: parseInt(e.target.value) || 4 }))
                  }
                />
                <span className="text-sm text-zinc-400">semaines</span>
                <span className="text-xs text-zinc-600">(temps de cicatrisation entre les séances)</span>
              </div>
            </div>

            {/* ── Instructions personnalisées ───────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Instructions personnalisées pour l&apos;IA
              </p>
              <p className="text-xs text-zinc-600">
                Précisez comment l&apos;IA doit gérer vos grands projets (style, contraintes, formulations…)
              </p>
              <textarea
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Ex : Toujours proposer un premier RDV de consultation gratuit avant de planifier les séances. Prévenir le client que les grands projets nécessitent de la patience..."
                rows={4}
                value={config.aiInstructions}
                onChange={(e) => setConfig((c) => ({ ...c, aiInstructions: e.target.value }))}
              />
            </div>

            {/* ── Bouton sauvegarder ────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={saveConfig}
                disabled={saving}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Sauvegarde…" : "Enregistrer la configuration"}
              </Button>
              {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Enregistré</span>}
              {saveError && <span className="text-xs text-red-400">{saveError}</span>}
            </div>
          </>
        )}
      </div>

      {/* ── Section projets détectés ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-zinc-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Grands projets détectés par l&apos;IA
          </h2>
          {projects.length > 0 && (
            <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {active.length} actif{active.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {projectsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 px-4 py-6 text-center">
            <Bot className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">Aucun grand projet détecté pour l&apos;instant.</p>
            <p className="text-xs text-zinc-700 mt-1">
              L&apos;IA créera automatiquement un projet quand un client en parlera dans le tchat.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((p) => (
              <ProjectCard key={p.id} project={p} onUpdate={updateProjectStatus} />
            ))}
            {archived.length > 0 && (
              <>
                <p className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Archivés</p>
                {archived.map((p) => (
                  <ProjectCard key={p.id} project={p} onUpdate={updateProjectStatus} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
