// Pont Apple Santé (via l'app iOS "Health Auto Export" → POST JSON). Logique PURE et testable.
// Apple Santé est le hub : balance connectée, app calories, iPhone y écrivent tout.

// Métrique canonique : clé stable côté ARISE, quel que soit le nom côté export.
export type HealthMetricDef = {
  key: string;          // clé canonique ARISE
  label: string;        // libellé FR pour l'UI
  icon: string;
  unit: string;         // unité d'affichage
  agg: "sum" | "last" | "max";  // agrégation intra-journée
  aliases: string[];    // noms possibles côté Health Auto Export (insensible casse/espaces)
};

export const HEALTH_METRICS: HealthMetricDef[] = [
  { key: "steps", label: "Pas", icon: "👟", unit: "pas", agg: "sum", aliases: ["step_count", "steps"] },
  { key: "active_energy", label: "Calories actives", icon: "🔥", unit: "kcal", agg: "sum", aliases: ["active_energy", "active_energy_burned"] },
  { key: "dietary_energy", label: "Calories ingérées", icon: "🍽️", unit: "kcal", agg: "sum", aliases: ["dietary_energy", "dietary_energy_consumed", "calories"] },
  { key: "protein", label: "Protéines", icon: "🥩", unit: "g", agg: "sum", aliases: ["protein"] },
  { key: "weight", label: "Poids", icon: "⚖️", unit: "kg", agg: "last", aliases: ["weight_body_mass", "body_mass", "weight", "bodymass"] },
  { key: "body_fat", label: "Masse grasse", icon: "📉", unit: "%", agg: "last", aliases: ["body_fat_percentage", "bodyfat"] },
  { key: "sleep", label: "Sommeil", icon: "😴", unit: "h", agg: "sum", aliases: ["sleep_analysis", "sleep_asleep", "asleep"] },
  { key: "distance", label: "Distance", icon: "🏃", unit: "km", agg: "sum", aliases: ["walking_running_distance", "distance", "distance_walking_running"] },
  { key: "exercise_time", label: "Minutes d'exercice", icon: "💪", unit: "min", agg: "sum", aliases: ["apple_exercise_time", "exercise_time", "exercise_minutes"] },
  { key: "stand_hours", label: "Heures debout", icon: "🧍", unit: "h", agg: "sum", aliases: ["apple_stand_hour", "stand_hours", "apple_stand_time"] },
  { key: "flights", label: "Étages montés", icon: "🪜", unit: "étages", agg: "sum", aliases: ["flights_climbed"] },
  { key: "water", label: "Eau bue", icon: "💧", unit: "L", agg: "sum", aliases: ["dietary_water", "water"] },
  { key: "mindful", label: "Minutes de pleine conscience", icon: "🧘", unit: "min", agg: "sum", aliases: ["mindful_minutes", "mindful_session"] },
  { key: "resting_hr", label: "FC au repos", icon: "❤️", unit: "bpm", agg: "last", aliases: ["resting_heart_rate"] },
  { key: "vo2max", label: "VO2 max", icon: "🫁", unit: "ml/kg/min", agg: "last", aliases: ["vo2_max", "vo2max"] },
];
export const METRIC_BY_KEY: Record<string, HealthMetricDef> = Object.fromEntries(HEALTH_METRICS.map((m) => [m.key, m]));

// Normalise un nom de métrique venant de l'export → clé canonique (ou null si inconnue).
export function canonicalMetric(rawName: string): string | null {
  const n = String(rawName || "").toLowerCase().replace(/[\s-]+/g, "_");
  for (const m of HEALTH_METRICS) {
    if (m.key === n || m.aliases.includes(n)) return m.key;
  }
  return null;
}

// Certaines unités doivent être converties vers l'unité d'affichage ARISE.
export function normalizeValue(key: string, qty: number, unit: string): number {
  const u = String(unit || "").toLowerCase();
  if (key === "weight" && (u === "lb" || u === "lbs")) return qty * 0.45359237;
  if (key === "distance" && (u === "m" || u === "meter" || u === "meters")) return qty / 1000;
  if (key === "distance" && (u === "mi" || u === "miles")) return qty * 1.609344;
  if (key === "sleep" && (u === "min" || u === "minutes")) return qty / 60;
  if (key === "water" && u === "ml") return qty / 1000;
  return qty;
}

// Agrège une liste de points d'une même journée selon la sémantique de la métrique.
export function aggregate(key: string, values: number[]): number {
  if (!values.length) return 0;
  const def = METRIC_BY_KEY[key];
  const agg = def?.agg ?? "sum";
  if (agg === "last") return values[values.length - 1];
  if (agg === "max") return Math.max(...values);
  return values.reduce((s, v) => s + v, 0);
}

// Une quête auto est satisfaite quand la valeur atteint le seuil (≥).
export function autoQuestSatisfied(value: number, threshold: number): boolean {
  return Number.isFinite(value) && Number.isFinite(threshold) && value >= threshold;
}

// Extraction du payload Health Auto Export (format REST API) :
// { data: { metrics: [ { name, units, data: [ { date: "2026-07-01 08:00:00 +0200", qty } ] } ] } }
export type ParsedSample = { date: string; metric: string; value: number; unit: string };
type RawPoint = { date?: string; qty?: number; Avg?: number; avg?: number; asleep?: number; totalSleep?: number; value?: number };
type RawMetric = { name?: string; units?: string; data?: RawPoint[] };

export function parseHealthPayload(payload: unknown): ParsedSample[] {
  const metrics: RawMetric[] = (payload as { data?: { metrics?: RawMetric[] } })?.data?.metrics ?? [];
  const byDayMetric: Record<string, { key: string; unit: string; day: string; values: number[] }> = {};
  for (const m of metrics) {
    const key = canonicalMetric(m?.name || "");
    if (!key) continue;
    for (const p of m?.data ?? []) {
      const rawQty = p?.qty ?? p?.asleep ?? p?.totalSleep ?? p?.Avg ?? p?.avg ?? p?.value;
      if (typeof rawQty !== "number" || !Number.isFinite(rawQty)) continue;
      const day = String(p?.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const v = normalizeValue(key, rawQty, m?.units || "");
      const mapKey = day + "|" + key;
      (byDayMetric[mapKey] ||= { key, unit: METRIC_BY_KEY[key]?.unit || "", day, values: [] }).values.push(v);
    }
  }
  const out: ParsedSample[] = [];
  for (const g of Object.values(byDayMetric)) {
    out.push({ date: g.day, metric: g.key, value: Math.round(aggregate(g.key, g.values) * 100) / 100, unit: g.unit });
  }
  return out;
}
