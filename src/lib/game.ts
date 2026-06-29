// Logique de jeu PURE (testable sans base de donnees ni framework).
import { LEVEL_CURVE, RANKS, RANK_THRESHOLDS, type Rank } from "./game.config";

// XP necessaire pour passer du niveau `level` a `level + 1`.
export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.round(LEVEL_CURVE.base * Math.pow(level, LEVEL_CURVE.exponent));
}

// XP cumule pour atteindre `level` en partant du niveau 1.
export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  return total;
}

export type ApplyXpResult = {
  level: number;
  xp: number;
  leveledUp: boolean;
  levelsGained: number;
};

// Ajoute de l'XP a un attribut et gere les montees de niveau en cascade.
export function applyXp(level: number, xp: number, gained: number): ApplyXpResult {
  let lvl = Math.max(1, Math.floor(level));
  let cur = Math.max(0, xp) + Math.max(0, gained);
  let levelsGained = 0;
  let need = xpForLevel(lvl);
  while (cur >= need) {
    cur -= need;
    lvl += 1;
    levelsGained += 1;
    need = xpForLevel(lvl);
  }
  return { level: lvl, xp: cur, leveledUp: levelsGained > 0, levelsGained };
}

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function nextRank(rank: Rank): Rank | null {
  const i = rankIndex(rank);
  if (i < 0 || i >= RANKS.length - 1) return null;
  return RANKS[i + 1];
}

export type PromotionCheck = {
  nextRank: Rank | null;
  eligible: boolean;
  required: number | null;
  missing: { code: string; level: number }[];
};

// Le Chasseur peut tenter la promotion si TOUS ses attributs atteignent
// le seuil du rang vise.
export function checkPromotion(
  currentRank: Rank,
  attributes: { code: string; level: number }[]
): PromotionCheck {
  const target = nextRank(currentRank);
  if (!target) return { nextRank: null, eligible: false, required: null, missing: [] };
  const required = RANK_THRESHOLDS[target as Exclude<Rank, "F">];
  const missing = attributes.filter((a) => a.level < required);
  return { nextRank: target, eligible: missing.length === 0, required, missing };
}

export function totalPower(attributes: { level: number }[]): number {
  return attributes.reduce((s, a) => s + a.level, 0);
}

// Progression (0..1) vers l'eligibilite au rang suivant, moyennee sur les attributs.
export function promotionProgress(
  currentRank: Rank,
  attributes: { level: number }[]
): number {
  const target = nextRank(currentRank);
  if (!target) return 1;
  const required = RANK_THRESHOLDS[target as Exclude<Rank, "F">];
  if (attributes.length === 0) return 0;
  const sum = attributes.reduce((s, a) => s + Math.min(1, a.level / required), 0);
  return sum / attributes.length;
}
