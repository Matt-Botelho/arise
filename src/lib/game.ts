import { LEVEL_CURVE, RANKS, RANK_THRESHOLDS, PENALTY_PRESETS, type Rank, type PenaltyIntensity } from "./game.config";

export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.round(LEVEL_CURVE.base * Math.pow(level, LEVEL_CURVE.exponent));
}
export function cumulativeXpForLevel(level: number): number {
  let total = 0; for (let l = 1; l < level; l++) total += xpForLevel(l); return total;
}
export type ApplyXpResult = { level: number; xp: number; leveledUp: boolean; levelsGained: number };
export function applyXp(level: number, xp: number, gained: number): ApplyXpResult {
  let lvl = Math.max(1, Math.floor(level));
  let cur = Math.max(0, xp) + Math.max(0, gained);
  let levelsGained = 0; let need = xpForLevel(lvl);
  while (cur >= need) { cur -= need; lvl += 1; levelsGained += 1; need = xpForLevel(lvl); }
  return { level: lvl, xp: cur, leveledUp: levelsGained > 0, levelsGained };
}
export function rankIndex(rank: Rank): number { return RANKS.indexOf(rank); }
export function nextRank(rank: Rank): Rank | null {
  const i = rankIndex(rank); if (i < 0 || i >= RANKS.length - 1) return null; return RANKS[i + 1];
}
export type PromotionCheck = { nextRank: Rank | null; eligible: boolean; required: number | null; missing: { code: string; level: number }[] };
export function checkPromotion(currentRank: Rank, attributes: { code: string; level: number }[]): PromotionCheck {
  const target = nextRank(currentRank);
  if (!target) return { nextRank: null, eligible: false, required: null, missing: [] };
  const required = RANK_THRESHOLDS[target as Exclude<Rank, "F">];
  const missing = attributes.filter((a) => a.level < required);
  return { nextRank: target, eligible: missing.length === 0, required, missing };
}
export function totalPower(attributes: { level: number }[]): number { return attributes.reduce((s, a) => s + a.level, 0); }
export function promotionProgress(currentRank: Rank, attributes: { level: number }[]): number {
  const target = nextRank(currentRank); if (!target) return 1;
  const required = RANK_THRESHOLDS[target as Exclude<Rank, "F">];
  if (attributes.length === 0) return 0;
  return attributes.reduce((s, a) => s + Math.min(1, a.level / required), 0) / attributes.length;
}

// --- Phase 2 ---
export function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return dt.getUTCFullYear() + "-" + mm + "-" + dd;
}
export function penaltyFor(intensity: PenaltyIntensity, baseXp: number) {
  const p = PENALTY_PRESETS[intensity] ?? PENALTY_PRESETS.fidele;
  return { hpLoss: p.hpLoss, xpLoss: Math.round(p.xpMalusPct * baseXp), resetStreak: p.resetStreak };
}
export function xpAfterPenalty(level: number, xp: number, loss: number) {
  return { level, xp: Math.max(0, xp - Math.max(0, loss)) };
}
export function isExhausted(hp: number): boolean { return hp <= 0; }
