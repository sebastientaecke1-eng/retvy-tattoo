"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import type {
  ProBlockedDateRow,
  ProScheduleRow,
  ProStyleDurationRow,
} from "@/lib/database.types";
import { PRO_STYLE_OPTIONS } from "@/lib/pro/styles";
import {
  type DurationTierRange,
  type SizeCategory,
  SIZE_CATEGORY_OPTIONS,
  flattenTierState,
  mergeInitialTierState,
} from "@/lib/pro/style-duration-tiers";
import {
  WEEKDAYS,
  type DayOfWeek,
  toTimeInputValue,
} from "@/lib/pro/weekdays";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TimeSlot = { start_time: string; end_time: string };

type DayState = {
  active: boolean;
  slots: TimeSlot[];
};

type Props = {
  initialSchedules: Pick<
    ProScheduleRow,
    "day_of_week" | "start_time" | "end_time"
  >[];
  initialBlocked: Pick<ProBlockedDateRow, "blocked_date">[];
  initialDurations: Pick<
    ProStyleDurationRow,
    | "style"
    | "size_category"
    | "duration_min_minutes"
    | "duration_max_minutes"
    | "duration_minutes"
  >[];
  profileStyles: string[];
};

function buildInitialDays(
  schedules: Pick<ProScheduleRow, "day_of_week" | "start_time" | "end_time">[],
): Record<DayOfWeek, DayState> {
  const days = Object.fromEntries(
    WEEKDAYS.map((d) => [
      d.id,
      { active: false, slots: [{ start_time: "10:00", end_time: "19:00" }] },
    ]),
  ) as Record<DayOfWeek, DayState>;

  for (const row of schedules) {
    const day = row.day_of_week as DayOfWeek;
    if (day < 0 || day > 6) continue;
    if (!days[day].active) {
      days[day].active = true;
      days[day].slots = [];
    }
    days[day].slots.push({
      start_time: toTimeInputValue(row.start_time),
      end_time: toTimeInputValue(row.end_time),
    });
  }

  return days;
}

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AvailabilitiesForm({
  initialSchedules,
  initialBlocked,
  initialDurations,
  profileStyles,
}: Props) {
  const [days, setDays] = useState(() => buildInitialDays(initialSchedules));
  const [blockedDates, setBlockedDates] = useState<string[]>(
    initialBlocked.map((b) => b.blocked_date).sort(),
  );
  const [pickDate, setPickDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const styleLabels = useMemo(() => {
    const map = new Map(PRO_STYLE_OPTIONS.map((o) => [o.id, o.label]));
    return profileStyles.map((id) => ({
      id,
      label: map.get(id as (typeof PRO_STYLE_OPTIONS)[number]["id"]) ?? id,
    }));
  }, [profileStyles]);

  const [durationTiers, setDurationTiers] = useState<
    Record<string, Record<SizeCategory, DurationTierRange>>
  >(() => mergeInitialTierState(profileStyles, initialDurations));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleDay(dayId: DayOfWeek) {
    setDays((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        active: !prev[dayId].active,
        slots:
          prev[dayId].slots.length > 0
            ? prev[dayId].slots
            : [{ start_time: "10:00", end_time: "19:00" }],
      },
    }));
  }

  function addSlot(dayId: DayOfWeek) {
    setDays((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: [
          ...prev[dayId].slots,
          { start_time: "14:00", end_time: "18:00" },
        ],
      },
    }));
  }

  function removeSlot(dayId: DayOfWeek, index: number) {
    setDays((prev) => {
      const slots = prev[dayId].slots.filter((_, i) => i !== index);
      return {
        ...prev,
        [dayId]: {
          ...prev[dayId],
          slots:
            slots.length > 0
              ? slots
              : [{ start_time: "10:00", end_time: "19:00" }],
        },
      };
    });
  }

  function updateSlot(
    dayId: DayOfWeek,
    index: number,
    field: "start_time" | "end_time",
    value: string,
  ) {
    setDays((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        slots: prev[dayId].slots.map((s, i) =>
          i === index ? { ...s, [field]: value } : s,
        ),
      },
    }));
  }

  function addBlockedFromPicker() {
    if (!pickDate || blockedDates.includes(pickDate)) return;
    setBlockedDates((prev) => [...prev, pickDate].sort());
    setPickDate("");
  }

  function toggleBlockedOnCalendar(iso: string) {
    setBlockedDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );
  }

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ iso, day: d });
    }
    return cells;
  }, [calendarMonth]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const schedules = WEEKDAYS.map((d) => ({
      day_of_week: d.id,
      active: days[d.id].active,
      slots: days[d.id].active ? days[d.id].slots : [],
    }));

    const style_durations = flattenTierState(durationTiers);

    for (const tier of style_durations) {
      if (
        Number.isNaN(tier.duration_min_minutes) ||
        Number.isNaN(tier.duration_max_minutes)
      ) {
        setError("Durées invalides.");
        setSaving(false);
        return;
      }
      if (tier.duration_max_minutes < tier.duration_min_minutes) {
        setError("La durée max doit être supérieure ou égale à la durée min.");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/pro/availabilities", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedules,
          blocked_dates: blockedDates,
          style_durations,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Échec sauvegarde");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (profileStyles.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200">
        Définissez au moins un style dans{" "}
        <a href="/pro/dashboard/profil" className="underline">
          Mon profil
        </a>{" "}
        pour configurer les estimations de durée.
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Disponibilités</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Horaires, congés et estimations de durée par style et taille.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          Disponibilités enregistrées
        </p>
      )}

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Horaires de travail
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {WEEKDAYS.map((day) => {
            const state = days[day.id];
            return (
              <div
                key={day.id}
                className="rounded-xl border border-zinc-800/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={state.active}
                      onChange={() => toggleDay(day.id)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500/30"
                    />
                    <span className="font-medium text-zinc-200">{day.label}</span>
                  </label>
                  {state.active && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlot(day.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Créneau
                    </Button>
                  )}
                </div>
                {state.active && (
                  <div className="mt-4 space-y-3">
                    {state.slots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <label className="text-xs text-zinc-500">
                          Début
                          <Input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              updateSlot(day.id, idx, "start_time", e.target.value)
                            }
                            className="mt-1 w-36"
                          />
                        </label>
                        <label className="text-xs text-zinc-500">
                          Fin
                          <Input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) =>
                              updateSlot(day.id, idx, "end_time", e.target.value)
                            }
                            className="mt-1 w-36"
                          />
                        </label>
                        {state.slots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlot(day.id, idx)}
                            aria-label="Supprimer le créneau"
                          >
                            <Trash2 className="h-4 w-4 text-zinc-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Dates bloquées
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Ces jours seront indisponibles pour les clients.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-zinc-400">
              Ajouter une date
              <Input
                type="date"
                value={pickDate}
                onChange={(e) => setPickDate(e.target.value)}
                className="mt-1"
              />
            </label>
            <Button type="button" variant="outline" onClick={addBlockedFromPicker}>
              Ajouter
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-800 p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                ←
              </Button>
              <span className="text-sm font-medium capitalize text-zinc-200">
                {calendarMonth.toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                →
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
              {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {calendarCells.map((cell, i) =>
                cell.iso ? (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => toggleBlockedOnCalendar(cell.iso!)}
                    className={
                      blockedDates.includes(cell.iso)
                        ? "rounded-lg bg-amber-500/25 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-500/50"
                        : "rounded-lg py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                    }
                  >
                    {cell.day}
                  </button>
                ) : (
                  <div key={`empty-${i}`} />
                ),
              )}
            </div>
          </div>

          {blockedDates.length > 0 ? (
            <ul className="space-y-2">
              {blockedDates.map((iso) => (
                <li
                  key={iso}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300"
                >
                  {formatDateLabel(iso)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBlockedDates((prev) => prev.filter((d) => d !== iso))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600">Aucune date bloquée.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Estimation de durée par style
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Fourchette en minutes selon la taille du projet. L&apos;IA utilisera
            la moyenne (min + max) / 2 pour bloquer le créneau.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {styleLabels.map(({ id, label }) => (
            <div
              key={id}
              className="rounded-xl border border-zinc-800/80 p-4"
            >
              <h3 className="font-medium text-zinc-200">{label}</h3>
              <div className="mt-4 space-y-4">
                {SIZE_CATEGORY_OPTIONS.map((tier) => (
                  <div
                    key={tier.id}
                    className="grid gap-3 border-t border-zinc-800/80 pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[140px_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-300">
                        {tier.label}
                      </p>
                      <p className="text-xs text-zinc-500">{tier.hint}</p>
                    </div>
                    <label className="text-xs text-zinc-500">
                      Min (min)
                      <Input
                        type="number"
                        min={15}
                        max={1440}
                        step={15}
                        value={durationTiers[id]?.[tier.id]?.min ?? ""}
                        onChange={(e) =>
                          setDurationTiers((prev) => ({
                            ...prev,
                            [id]: {
                              ...prev[id],
                              [tier.id]: {
                                ...prev[id][tier.id],
                                min: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="mt-1"
                      />
                    </label>
                    <label className="text-xs text-zinc-500">
                      Max (min)
                      <Input
                        type="number"
                        min={15}
                        max={1440}
                        step={15}
                        value={durationTiers[id]?.[tier.id]?.max ?? ""}
                        onChange={(e) =>
                          setDurationTiers((prev) => ({
                            ...prev,
                            [id]: {
                              ...prev[id],
                              [tier.id]: {
                                ...prev[id][tier.id],
                                max: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="mt-1"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer les disponibilités"
          )}
        </Button>
      </div>
    </form>
  );
}
