// Coeur de progression v2 (pur, testable).
export const RANKS = ["F","E","D","C","B","A","S","S+","SS","SS Elite"] as const;
export type Rank = (typeof RANKS)[number];
export const LEVELS_PER_RANK = 10;
export const MAX_LEVEL = 100;

export function rankIndex(r: string): number { return (RANKS as readonly string[]).indexOf(r); }
export function rankCeiling(r: string): number { const i = rankIndex(r); return i < 0 ? LEVELS_PER_RANK : (i + 1) * LEVELS_PER_RANK; }
export function nextRank(r: string): Rank | null { const i = rankIndex(r); return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null; }

export const GLOBAL_CURVE = { base: 100, exp: 1.6 };
export const ATTR_CURVE = { base: 100, exp: 1.5 };
export function globalXpForLevel(L: number): number { return L < 1 ? 0 : Math.round(GLOBAL_CURVE.base * Math.pow(L, GLOBAL_CURVE.exp)); }
export function attrXpForLevel(L: number): number { return L < 1 ? 0 : Math.round(ATTR_CURVE.base * Math.pow(L, ATTR_CURVE.exp)); }

// XP global : monte le niveau jusqu'au plafond du rang, puis bloque (or/loot continuent ailleurs).
export function applyGlobalXp(level: number, xp: number, gained: number, ceiling: number) {
  let lvl = Math.max(1, Math.floor(level));
  let cur = Math.max(0, xp) + Math.max(0, gained);
  let g = 0; let need = globalXpForLevel(lvl);
  while (lvl < ceiling && cur >= need) { cur -= need; lvl++; g++; need = globalXpForLevel(lvl); }
  const atCeiling = lvl >= ceiling;
  if (atCeiling) cur = Math.min(cur, need); // barre pleine, pas de dépassement
  return { level: lvl, xp: cur, leveledUp: g > 0, levelsGained: g, atCeiling };
}

// XP d'attribut : plafonné par le niveau global du joueur.
export function applyAttrXp(level: number, xp: number, gained: number, globalLevel: number) {
  let lvl = Math.max(1, Math.floor(level));
  let cur = Math.max(0, xp);
  if (lvl >= globalLevel) return { level: lvl, xp: cur, leveledUp: false, levelsGained: 0, capped: true };
  cur += Math.max(0, gained);
  let g = 0; let need = attrXpForLevel(lvl);
  while (lvl < globalLevel && cur >= need) { cur -= need; lvl++; g++; need = attrXpForLevel(lvl); }
  const capped = lvl >= globalLevel;
  if (capped) cur = Math.min(cur, need);
  return { level: lvl, xp: cur, leveledUp: g > 0, levelsGained: g, capped };
}

// Le donjon de rang est dispo quand on a atteint le plafond du rang.
export function rankUpAvailable(globalLevel: number, rank: string): boolean {
  return globalLevel >= rankCeiling(rank) && nextRank(rank) !== null;
}

// Thème de la quête obligatoire selon le jour (0=dim..6=sam), réglable.
export const DEFAULT_DAY_THEME: Record<number, string> = {
  1: "FOR", 2: "VIT", 3: "VOL", 4: "FIN", 5: "INT", 6: "TRA", 0: "FAM",
};
export function themeForDay(weekday: number, map: Record<number, string> = DEFAULT_DAY_THEME): string {
  return map[weekday] ?? "VIT";
}
