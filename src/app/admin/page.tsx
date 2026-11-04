"use client";

import { useEffect, useState, useCallback } from "react";
import { PricingCards } from "@/components/pricing-cards";
import {
  Loader2, Check, X, Search, Sparkles,
  LayoutDashboard, Users, CreditCard, Zap,
  TrendingUp, TrendingDown, Minus, Eye,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type PlanTier = "free" | "starter" | "pro" | "premium";
type MultiTier = "small" | "large" | null;
type View = "overview" | "clients" | "plans";

type Profile = {
  user_id: string;
  artist_name: string;
  first_name: string;
  last_name: string;
  slug: string;
  subscription_tier: string | null;
  multi_artists_tier: string | null;
  subscription_status: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  active: number;
  byTier: Record<string, number>;
  mrr: number;
  arr: number;
  newThisWeek: number;
};

type WeekPoint = { label: string; mrr: number; newSubs: number };
type DayPoint  = { date: string; label: string; count: number };
type Analytics = { weeks: WeekPoint[]; dailyLogins: DayPoint[] };

// ─── Constants ───────────────────────────────────────────────────────────────
const TIERS: PlanTier[] = ["free", "starter", "pro", "premium"];

const TIER_PILL: Record<PlanTier, string> = {
  free:    "bg-zinc-700/60 text-zinc-400",
  starter: "bg-sky-500/20 text-sky-300",
  pro:     "bg-violet-500/20 text-violet-300",
  premium: "bg-blue-500/20 text-blue-300",
};
const TIER_BTN_ACTIVE: Record<PlanTier, string> = {
  free:    "bg-zinc-700 text-zinc-200",
  starter: "bg-sky-600 text-white",
  pro:     "bg-violet-600 text-white",
  premium: "bg-blue-600 text-white",
};
const TIER_BAR: Record<PlanTier, string> = {
  free:    "bg-zinc-600",
  starter: "bg-sky-500",
  pro:     "bg-violet-500",
  premium: "bg-blue-500",
};
const MULTI_LABELS: Record<string, string> = { small: "2-3 artistes", large: "4+ artistes" };

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " €";
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  if (d < 7) return `il y a ${d} j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────
function Sparkline({
  values, color = "#3b82f6", fillColor = "rgba(59,130,246,0.12)", height = 48,
}: {
  values: number[]; color?: string; fillColor?: string; height?: number;
}) {
  if (values.length < 2) return null;
  const w = 200;
  const h = height;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return [x, y] as [number, number];
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const fill = `${d} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <path d={fill} fill={fillColor} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dernier point */}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Trend badge ─────────────────────────────────────────────────────────────
function Trend({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (prev === 0) return null;
  const pct = Math.round(((last - prev) / prev) * 100);
  if (pct > 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
      <TrendingUp className="h-3 w-3" />+{pct}%
    </span>
  );
  if (pct < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
      <TrendingDown className="h-3 w-3" />{pct}%
    </span>
  );
  return <span className="flex items-center gap-1 text-xs text-zinc-600"><Minus className="h-3 w-3" />0%</span>;
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [view, setView]           = useState<View>("overview");
  const [stats, setStats]         = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [search, setSearch]       = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [mySaving, setMySaving] = useState(false);
  const [mySaved,  setMySaved]  = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved,  setSaved]  = useState<string | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  // Stats KPIs
  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch("/api/admin/stats");
        if (res.status === 403) { setError("Accès refusé"); return; }
        const data = await res.json() as Stats & { error?: string };
        if (data.error) { setError(data.error); return; }
        setStats(data);
      } catch { setError("Erreur réseau"); }
      finally { setLoadingStats(false); }
    })();
  }, []);

  // Analytics (graphiques)
  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch("/api/admin/analytics");
        if (res.ok) {
          const data = await res.json() as Analytics;
          setAnalytics(data);
        }
      } catch { /* silencieux */ }
      finally { setLoadingAnalytics(false); }
    })();
  }, []);

  // Mon propre profil (admin)
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/me");
      const data = await res.json() as { profile?: Profile };
      if (data.profile) setMyProfile(data.profile);
    })();
  }, []);

  const updateMyPlan = async (tier: PlanTier) => {
    if (!myProfile) { alert("Profil admin non chargé"); return; }
    setMySaving(true); setMySaved(false);
    try {
      const res = await fetch("/api/admin/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myProfile.user_id, subscriptionTier: tier }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setMyProfile(prev => prev ? { ...prev, subscription_tier: tier } : prev);
        setMySaved(true);
        setTimeout(() => setMySaved(false), 2000);
      } else {
        alert("Erreur : " + (data.error ?? `HTTP ${res.status}`));
      }
    } catch (e) {
      alert("Erreur réseau : " + String(e));
    } finally {
      setMySaving(false);
    }
  };

  // Liste profils
  const fetchProfiles = useCallback(async (q = "") => {
    setLoadingList(true);
    try {
      const res  = await fetch(`/api/admin/set-tier?q=${encodeURIComponent(q)}`);
      if (res.status === 403) { setError("Accès refusé"); return; }
      const data = await res.json() as { profiles?: Profile[]; error?: string };
      if (data.error) { setError(data.error); return; }
      setProfiles(data.profiles ?? []);
    } catch { setError("Erreur réseau"); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { void fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => {
    const t = setTimeout(() => void fetchProfiles(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchProfiles]);

  const updateProfile = async (userId: string, subscriptionTier?: PlanTier, multiArtistsTier?: MultiTier) => {
    setSaving(userId); setSaved(null);
    try {
      const body: Record<string, unknown> = { userId };
      if (subscriptionTier  !== undefined) body.subscriptionTier  = subscriptionTier;
      if (multiArtistsTier  !== undefined) body.multiArtistsTier  = multiArtistsTier;
      const res  = await fetch("/api/admin/set-tier", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setSaved(userId);
        setTimeout(() => setSaved(null), 2000);
        setProfiles(prev => prev.map(p => p.user_id === userId ? {
          ...p,
          ...(subscriptionTier !== undefined ? { subscription_tier: subscriptionTier } : {}),
          ...(multiArtistsTier !== undefined ? { multi_artists_tier: multiArtistsTier } : {}),
        } : p));
      } else { alert(data.error ?? "Erreur"); }
    } catch { alert("Erreur réseau"); }
    finally { setSaving(null); }
  };

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-red-400">{error}</div>
  );

  const maxTier = stats ? Math.max(...Object.values(stats.byTier), 1) : 1;
  const today   = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // Données graphiques
  const mrrValues      = analytics?.weeks.map(w => w.mrr) ?? [];
  const loginValues    = analytics?.dailyLogins.map(d => d.count) ?? [];
  const recentLogins   = analytics?.dailyLogins.slice(-14) ?? [];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-zinc-800/60 py-6 px-4 sticky top-0 h-screen">
        <div className="px-3 mb-8">
          <span className="text-base font-bold tracking-widest">RET<span className="text-blue-400">V</span>Y</span>
        </div>
        <nav className="flex flex-col gap-1">
          {([
            { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="h-4 w-4" /> },
            { id: "clients",  label: "Clients",        icon: <Users className="h-4 w-4" /> },
            { id: "plans",    label: "Plans",           icon: <CreditCard className="h-4 w-4" /> },
          ] as { id: View; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                view === id ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}>
              {icon} {label}
            </button>
          ))}
          <div className="my-3 h-px bg-zinc-800" />
          <a href="/api/admin/view-as-pro?action=enter"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors">
            <Zap className="h-4 w-4" /> Voir comme pro
          </a>
          <a
            href={myProfile?.slug ? `/ink/${myProfile.slug}` : "/ink/retvy"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Eye className="h-4 w-4" /> Voir comme client
          </a>
        </nav>
        {/* ── Mon plan test ── */}
        {myProfile && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Mon plan test</p>
            <div className="grid grid-cols-2 gap-1">
              {TIERS.map(t => (
                <button key={t} disabled={mySaving} onClick={() => void updateMyPlan(t)}
                  className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                    myProfile.subscription_tier === t
                      ? TIER_BTN_ACTIVE[t]
                      : "border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-200"
                  }`}>
                  {mySaving ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : t}
                </button>
              ))}
            </div>
            {mySaved && <p className="text-[10px] text-emerald-400 mt-1.5 text-center">✓ Plan mis à jour</p>}
            <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
              Actuel : <span className="font-bold text-zinc-400">{myProfile.subscription_tier ?? "free"}</span>
            </p>
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold leading-none mb-1">Super Admin</p>
              <p className="text-[11px] text-zinc-500">sebastientaecke</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 px-8 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold">
            {view === "overview" && "Vue d'ensemble"}
            {view === "clients"  && "Clients"}
            {view === "plans"    && "Plans"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{today} · {stats?.total ?? "—"} profils</p>
        </div>

        {/* ── VUE D'ENSEMBLE ── */}
        {view === "overview" && (
          <>
            {/* KPI tiles */}
            {loadingStats ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
            ) : stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "MRR",     value: fmt(stats.mrr),  sub: "par mois" },
                  { label: "ARR",     value: fmt(stats.arr),  sub: "annualisé" },
                  { label: "Payants", value: String(stats.active), sub: "abonnés actifs" },
                  { label: "Pros",    value: String(stats.total),  sub: stats.newThisWeek > 0 ? `+${stats.newThisWeek} cette semaine` : "profils totaux", highlight: stats.newThisWeek > 0 },
                ].map(({ label, value, sub, highlight }) => (
                  <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">{label}</p>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    <p className={`text-[11px] mt-1 ${highlight ? "text-emerald-400" : "text-zinc-600"}`}>{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Graphiques MRR + Connexions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

              {/* MRR sur 8 semaines */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400">Évolution MRR</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">8 dernières semaines</p>
                  </div>
                  {!loadingAnalytics && <Trend values={mrrValues} />}
                </div>
                {loadingAnalytics ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-zinc-600" /></div>
                ) : (
                  <>
                    <Sparkline values={mrrValues} color="#3b82f6" fillColor="rgba(59,130,246,0.10)" />
                    {analytics && (
                      <div className="flex justify-between mt-2">
                        {analytics.weeks.filter((_, i) => i % 2 === 0).map(w => (
                          <span key={w.label} className="text-[10px] text-zinc-700">{w.label}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Connexions journalières */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400">Connexions par jour</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">14 derniers jours</p>
                  </div>
                  {!loadingAnalytics && analytics && (
                    <span className="text-xs font-semibold text-violet-400">
                      {analytics.dailyLogins.slice(-1)[0]?.count ?? 0} auj.
                    </span>
                  )}
                </div>
                {loadingAnalytics ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-zinc-600" /></div>
                ) : (
                  <>
                    <Sparkline values={loginValues.slice(-14)} color="#a78bfa" fillColor="rgba(167,139,250,0.10)" />
                    {recentLogins.length > 0 && (
                      <div className="flex justify-between mt-2">
                        {recentLogins.filter((_, i) => i % 3 === 0).map(d => (
                          <span key={d.date} className="text-[10px] text-zinc-700">{d.label}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Répartition par plan + Activité récente */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-zinc-400 mb-4">Répartition par plan</p>
                <div className="space-y-3">
                  {TIERS.map(t => {
                    const count = stats?.byTier[t] ?? 0;
                    const pct   = (stats?.total ?? 0) > 0 ? (count / maxTier) * 100 : 0;
                    return (
                      <div key={t} className="flex items-center gap-3">
                        <span className={`w-[60px] shrink-0 text-center text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${TIER_PILL[t]}`}>{t}</span>
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${TIER_BAR[t]}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-5 text-right text-sm font-semibold text-zinc-300 tabular-nums">{count}</span>
                        <span className="w-8 text-right text-[11px] text-zinc-600 tabular-nums">
                          {(stats?.total ?? 0) > 0 ? Math.round((count / (stats?.total ?? 1)) * 100) : 0}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-zinc-400 mb-4">Activité récente</p>
                <div className="space-y-0">
                  {profiles.slice(0, 5).map(p => (
                    <div key={p.user_id} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.artist_name || `${p.first_name} ${p.last_name}`}</p>
                        <p className="text-[11px] text-zinc-500">{timeAgo(p.created_at)}</p>
                      </div>
                      <span className={`ml-auto shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${TIER_PILL[(p.subscription_tier as PlanTier) ?? "free"]}`}>
                        {p.subscription_tier ?? "free"}
                      </span>
                    </div>
                  ))}
                  {profiles.length === 0 && !loadingList && (
                    <p className="text-sm text-zinc-600 py-2">Aucun profil</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── CLIENTS / PLANS ── */}
        {view === "clients" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, slug…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            {loadingList ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
            ) : profiles.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-600">Aucun profil trouvé</p>
            ) : (
              <div className="space-y-2">
                {profiles.map(p => {
                  const tier      = (p.subscription_tier ?? "free") as PlanTier;
                  const multiTier = p.multi_artists_tier as MultiTier;
                  const isSaving  = saving === p.user_id;
                  const isSaved   = saved  === p.user_id;

                  return (
                    <div key={p.user_id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{p.artist_name || `${p.first_name} ${p.last_name}`}</span>
                            <span className="text-xs text-zinc-600">/{p.slug}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TIER_PILL[tier]}`}>{tier}</span>
                            {multiTier && <span className="text-[9px] font-semibold bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full">{MULTI_LABELS[multiTier]}</span>}
                            {p.subscription_status === "active" && <span className="text-[10px] text-emerald-400">● actif</span>}
                            <span className="text-[10px] text-zinc-700">{new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
                          {isSaved  && <Check className="h-4 w-4 text-emerald-400" />}
                        </div>
                      </div>

                      {/* Plan switcher */}
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">Plan</p>
                        <div className="flex flex-wrap gap-1.5">
                          {TIERS.map(t => (
                            <button key={t} disabled={isSaving} onClick={() => void updateProfile(p.user_id, t)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                tier === t ? TIER_BTN_ACTIVE[t] : "border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-200"
                              }`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Multi switcher */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">Multi-tatoueurs</p>
                        <div className="flex gap-1.5">
                          {([null, "small", "large"] as MultiTier[]).map(opt => (
                            <button key={opt ?? "none"} disabled={isSaving} onClick={() => void updateProfile(p.user_id, undefined, opt)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                multiTier === opt ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-200"
                              }`}>
                              {opt === null ? <span className="flex items-center gap-1"><X className="h-3 w-3" />Aucun</span> : opt === "small" ? "2-3" : "4+"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

                {/* ── PLANS : visualisation page tarifs client ── */}
        {view === "plans" && (
          <PricingCards adminPreview />
        )}
      </main>
    </div>
  );
}
