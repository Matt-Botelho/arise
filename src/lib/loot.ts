import { ITEMS, type LpcItem } from "./lpc-items";

export const RARITY_WEIGHT: Record<string, number> = { rare: 60, epique: 30, legendaire: 10, mythique: 4 };
const DIFF_CHANCE: Record<string, number> = { E: 0.12, D: 0.18, C: 0.28, B: 0.42, A: 0.58, S: 0.78 };

export function dropChance(difficulty: string): number {
  return DIFF_CHANCE[difficulty] ?? 0.15;
}

// Tire un objet (non-commun, non possédé) si le jet de drop réussit.
export function rollLoot(owned: string[], difficulty: string, rnd: () => number = Math.random): LpcItem | null {
  if (rnd() > dropChance(difficulty)) return null;
  const have = new Set(owned);
  const pool = ITEMS.filter((i) => i.rarity !== "commun" && i.rarity !== "base" && !have.has(i.key));
  if (!pool.length) return null;
  const weighted = pool.map((i) => ({ item: i, w: RARITY_WEIGHT[i.rarity] ?? 10 }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = rnd() * total;
  for (const x of weighted) { r -= x.w; if (r <= 0) return x.item; }
  return weighted[weighted.length - 1].item;
}
