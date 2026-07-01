import { ITEMS, type LpcItem } from "./lpc-items";

export const RARITY_WEIGHT: Record<string, number> = { rare: 60, epique: 30, legendaire: 10, mythique: 4 };
const DIFF_CHANCE: Record<string, number> = { E: 0.12, D: 0.18, C: 0.28, B: 0.42, A: 0.58, S: 0.78 };

// Valeur de revente d'un doublon, par rareté.
export const SELL_VALUE: Record<string, number> = { commun: 10, rare: 40, epique: 90, legendaire: 200, mythique: 400, base: 0 };

export function dropChance(difficulty: string): number {
  return DIFF_CHANCE[difficulty] ?? 0.15;
}

// Tire un objet non-commun si le jet réussit. Préfère le neuf ; sinon donne un doublon.
export function rollLoot(owned: string[], difficulty: string, rnd: () => number = Math.random, chanceBonus = 0): LpcItem | null {
  if (rnd() > dropChance(difficulty) + chanceBonus) return null;
  const have = new Set(owned);
  const pool = ITEMS.filter((i) => i.rarity !== "commun" && i.rarity !== "base");
  if (!pool.length) return null;
  const unowned = pool.filter((i) => !have.has(i.key));
  const target = unowned.length ? unowned : pool; // doublons une fois tout possédé
  const weighted = target.map((i) => ({ item: i, w: RARITY_WEIGHT[i.rarity] ?? 10 }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = rnd() * total;
  for (const x of weighted) { r -= x.w; if (r <= 0) return x.item; }
  return weighted[weighted.length - 1].item;
}

// Butin de passage de rang : la pièce la plus rare possible (neuve de préférence).
export function pickRankLoot(owned: string[]): LpcItem | null {
  const have = new Set(owned);
  for (const rar of ["legendaire", "epique", "rare"]) {
    const unowned = ITEMS.filter((i) => i.rarity === rar && !have.has(i.key));
    if (unowned.length) return unowned[Math.floor(Math.random() * unowned.length)];
  }
  for (const rar of ["legendaire", "epique", "rare"]) {
    const any = ITEMS.filter((i) => i.rarity === rar);
    if (any.length) return any[Math.floor(Math.random() * any.length)];
  }
  return null;
}
