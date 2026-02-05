/**
 * B3 — Relationship health: recency + frequency, tamamen local hesaplama.
 */

import type { Contact, Interaction } from "@/lib/api";

export type HealthStatus = "warm" | "cooling" | "cold";

export interface HealthThresholds {
  warmDays: number;
  coolingDays: number;
  frequencyMonths: number;
  minFrequencyForWarm: number;
}

const STORAGE_KEY = "vault-crm-health-thresholds";

const DEFAULT_THRESHOLDS: HealthThresholds = {
  warmDays: 30,
  coolingDays: 90,
  frequencyMonths: 6,
  minFrequencyForWarm: 1,
};

export function getHealthThresholds(): HealthThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THRESHOLDS };
    const parsed = JSON.parse(raw) as Partial<HealthThresholds>;
    return {
      warmDays: typeof parsed.warmDays === "number" ? parsed.warmDays : DEFAULT_THRESHOLDS.warmDays,
      coolingDays: typeof parsed.coolingDays === "number" ? parsed.coolingDays : DEFAULT_THRESHOLDS.coolingDays,
      frequencyMonths: typeof parsed.frequencyMonths === "number" ? parsed.frequencyMonths : DEFAULT_THRESHOLDS.frequencyMonths,
      minFrequencyForWarm: typeof parsed.minFrequencyForWarm === "number" ? parsed.minFrequencyForWarm : DEFAULT_THRESHOLDS.minFrequencyForWarm,
    };
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}

export function setHealthThresholds(t: HealthThresholds): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export interface RelationshipHealthResult {
  health: HealthStatus;
  recencyDays: number | null;
  frequencyInPeriod: number;
  label: string;
}

/** B3.1: Recency (son temas ne zaman) + frequency (son N ayda kaç temas). */
export function getRelationshipHealth(
  contact: Pick<Contact, "last_touched_at">,
  interactions: Interaction[],
  thresholds: HealthThresholds = getHealthThresholds()
): RelationshipHealthResult {
  const now = Date.now();
  const recencyDays = contact.last_touched_at
    ? Math.floor((now - new Date(contact.last_touched_at).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  const since = new Date(now);
  since.setMonth(since.getMonth() - thresholds.frequencyMonths);
  const frequencyInPeriod = (Array.isArray(interactions) ? interactions : []).filter(
    (i) => new Date(i.happened_at).getTime() >= since.getTime()
  ).length;

  let health: HealthStatus = "cold";
  if (recencyDays !== null) {
    if (recencyDays <= thresholds.warmDays && frequencyInPeriod >= thresholds.minFrequencyForWarm) {
      health = "warm";
    } else if (recencyDays <= thresholds.coolingDays || frequencyInPeriod >= 1) {
      health = "cooling";
    }
  } else if (frequencyInPeriod >= 1) {
    health = "cooling";
  }

  const labels: Record<HealthStatus, string> = {
    warm: "Warm",
    cooling: "Cooling",
    cold: "Cold",
  };

  return {
    health,
    recencyDays,
    frequencyInPeriod,
    label: labels[health],
  };
}

/** Sadece recency ile (liste görünümünde interaction sayısı yok). */
export function getRelationshipHealthRecencyOnly(
  contact: Pick<Contact, "last_touched_at">,
  thresholds: HealthThresholds = getHealthThresholds()
): RelationshipHealthResult {
  const now = Date.now();
  const recencyDays = contact.last_touched_at
    ? Math.floor((now - new Date(contact.last_touched_at).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  let health: HealthStatus = "cold";
  if (recencyDays !== null) {
    if (recencyDays <= thresholds.warmDays) health = "warm";
    else if (recencyDays <= thresholds.coolingDays) health = "cooling";
  }

  const labels: Record<HealthStatus, string> = {
    warm: "Warm",
    cooling: "Cooling",
    cold: "Cold",
  };

  return {
    health,
    recencyDays,
    frequencyInPeriod: 0,
    label: labels[health],
  };
}

export const HEALTH_COLORS: Record<HealthStatus, { bg: string; text: string; border: string }> = {
  warm: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/40" },
  cooling: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/40" },
  cold: { bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/40" },
};
