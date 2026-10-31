"use client";

import { useEffect, useState } from "react";
import type { PlanTier } from "@/lib/stripe/plans";
import { hasFeature } from "@/lib/stripe/plans";
import { Eye, Calendar, CheckCircle, XCircle, Star, TrendingUp, Euro } from "lucide-react";

interface BasicStats {
  totalViews30: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  reviewCount: number;
  avgRating: number | null;
}

interface AdvancedStats {
  viewsChart: { date: string; count: number }[];
  bookingsChart: { month: string; confirmed: number; pending: number; cancelled: number }[];
  revenueChart: { month: string; revenue: number }[];
  conversionRate: number;
  topStyles: { style: string; count: number }[];
}

interface StatsData {
  basic: BasicStats;
  advanced: AdvancedStats | null;
}

function StatCard({ icon, label, value, sub, color = "blue" }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "amber" | "red" | "purple";
}) {
  const colors = {
    blue: "text-blue-400 bg-blue-950/40 border-blue-800/50",
    green: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
    amber: "text-amber-400 bg-amber-950/40 border-amber-800/50",
    red: "text-red-400 bg-red-950/40 border-red-800/50",
    purple: "text-blue-400 bg-blue-950/40 border-blue-800/50",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="mb-2 flex items-center gap-2 opacity-80">{icon}<span className="text-xs font-semibold uppercase tracking-wider">{label}</span></div>
      <p className="text-3xl font-bold leading-none">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, color = "#3b82f6" }: {
  data: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d, i) => {
        const val = values[i];
        const pct = (val / max) * 100;
        const label = String(d[labelKey]);
        const shortLabel = label.length === 10
          ? label.slice(5) // date MM-DD
          : label.slice(-2); // mois
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: val === 0 ? 0.2 : 0.85 }}
            />
            {data.length <= 12 && (
              <span className="mt-1 text-[9px] text-zinc-600">{shortLabel}</span>
            )}
            <div className="absolute bottom-full mb-1 hidden rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-700 dark:text-zinc-200 group-hover:block whitespace-nowrap">
              {label}: {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatsPage({ subscriptionTier = "free" }: { subscriptionTier?: PlanTier }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canBasic = hasFeature(subscriptionTier, "hasBasicStats");
  const canAdvanced = hasFeature(subscriptionTier, "hasAdvancedStats");

  useEffect(() => {
    if (!canBasic) { setLoading(false); return; }
    fetch("/api/pro/stats")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Erreur de chargement"); setLoading(false); });
  }, [canBasic]);

  if (!canBasic) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-8 text-center">
        <TrendingUp className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
        <h2 className="mb-2 text-lg font-bold text-zinc-300">Statistiques</h2>
        <p className="text-sm text-zinc-500">
          Les statistiques de profil sont disponibles a partir du plan{" "}
          <span className="font-semibold text-amber-400">Starter (22 EUR/mois)</span>.
        </p>
        <p className="mt-1 text-xs text-zinc-600">Vues du profil, reservations, avis et revenus.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-red-400">{error ?? "Erreur inconnue"}</p>;
  }

  const { basic, advanced } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Statistiques</h1>

      {/* ── Tuiles basiques ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Eye className="h-4 w-4" />} label="Vues 30j" value={basic.totalViews30} sub="visites du profil" color="blue" />
        <StatCard icon={<CheckCircle className="h-4 w-4" />} label="RDV confirmes" value={basic.confirmedBookings} sub={`sur ${basic.totalBookings} total`} color="green" />
        <StatCard icon={<Euro className="h-4 w-4" />} label="Acomptes encaisses" value={`${basic.totalRevenue} EUR`} sub="tout temps" color="purple" />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Note moyenne"
          value={basic.avgRating != null ? `${basic.avgRating}/5` : "—"}
          sub={`${basic.reviewCount} avis`}
          color="amber"
        />
      </div>

      {/* Tuiles secondaires */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-3 text-center">
          <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">{basic.pendingBookings}</p>
          <p className="text-xs text-zinc-500">En attente</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-3 text-center">
          <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">{basic.cancelledBookings}</p>
          <p className="text-xs text-zinc-500">Annules</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-3 text-center">
          <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">{basic.totalBookings}</p>
          <p className="text-xs text-zinc-500">Total RDV</p>
        </div>
      </div>

      {/* ── Stats avancees ── */}
      {!canAdvanced ? (
        <div className="rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5 text-center">
          <TrendingUp className="mx-auto mb-2 h-7 w-7 text-blue-600" />
          <p className="text-sm font-semibold text-blue-400">Stats avancees — Pro+</p>
          <p className="mt-1 text-xs text-zinc-500">
            Graphiques d evolution, taux de conversion, styles populaires et revenus mensuels
            disponibles a partir du plan Pro (27 EUR/mois).
          </p>
        </div>
      ) : advanced ? (
        <div className="space-y-4">
          {/* Taux de conversion */}
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-950/40">
              <span className="text-lg font-bold text-emerald-400">{advanced.conversionRate}%</span>
            </div>
            <div>
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Taux de conversion</p>
              <p className="text-xs text-zinc-500">demandes converties en RDV confirmes</p>
            </div>
          </div>

          {/* Vues 30 jours */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Vues du profil — 30 derniers jours</p>
            <BarChart data={advanced.viewsChart} valueKey="count" labelKey="date" color="#3b82f6" />
          </div>

          {/* Reservations par mois */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Reservations — 6 derniers mois</p>
            <div className="flex h-32 items-end gap-2">
              {advanced.bookingsChart.map((m) => {
                const total = m.confirmed + m.pending + m.cancelled;
                const maxLocal = Math.max(...advanced.bookingsChart.map((x) => x.confirmed + x.pending + x.cancelled), 1);
                const pct = (total / maxLocal) * 100;
                return (
                  <div key={m.month} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div className="w-full overflow-hidden rounded-t-sm" style={{ height: `${Math.max(pct, 4)}%` }}>
                      <div className="h-full w-full" style={{ background: "linear-gradient(to top, #10b981, #3b82f6)" }} />
                    </div>
                    <span className="mt-1 text-[9px] text-zinc-600">{m.month.slice(-2)}</span>
                    <div className="absolute bottom-full mb-1 hidden rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-700 dark:text-zinc-200 group-hover:block whitespace-nowrap">
                      {m.month}: {m.confirmed} confirmes
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenus mensuels */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Acomptes encaisses — 6 mois (EUR)</p>
            <BarChart data={advanced.revenueChart} valueKey="revenue" labelKey="month" color="#8b5cf6" />
          </div>

          {/* Styles populaires */}
          {advanced.topStyles.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Styles les plus demandes</p>
              <div className="space-y-2">
                {advanced.topStyles.map(({ style, count }, i) => {
                  const pct = (count / advanced.topStyles[0].count) * 100;
                  return (
                    <div key={style} className="flex items-center gap-2">
                      <span className="w-4 text-xs text-zinc-600">{i + 1}</span>
                      <span className="w-28 truncate text-sm font-medium capitalize text-zinc-300">{style}</span>
                      <div className="flex-1 rounded-full bg-gray-100 dark:bg-zinc-800">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
