// Forge des Ombres (inspiration forgemagie Dofus) : briser un doublon → Rune,
// appliquer une Rune sur un item → tentative d'ajout d'un bonus "exo" borné. Logique PURE.
import { ITEM_BY_KEY } from "./lpc-items";
import { itemEffect } from "./effects";

export type RuneType = "xp" | "gold" | "loot";
export const RUNE_LABEL: Record<RuneType, string> = { xp: "Rune d'Éveil (XP)", gold: "Rune d'Avarice (Or)", loot: "Rune de Fortune (Loot)" };
export const RUNE_ICON: Record<RuneType, string> = { xp: "🜂", gold: "🜚", loot: "🜁" };

// Runes stockées dans Hunter.runesJson : { xp: n, gold: n, loot: n }
export type Runes = Record<RuneType, number>;
export const EMPTY_RUNES: Runes = { xp: 0, gold: 0, loot: 0 };
export function parseRunes(json: string | null): Runes {
  if (!json) return { ...EMPTY_RUNES };
  try { const r = JSON.parse(json); return { xp: r.xp || 0, gold: r.gold || 0, loot: r.loot || 0 }; } catch { return { ...EMPTY_RUNES }; }
}

// Exo par item, stocké dans InventoryItem.exoJson : { xpPct, goldPct, lootPct }
export type Exo = { xpPct: number; goldPct: number; lootPct: number };
export const EMPTY_EXO: Exo = { xpPct: 0, goldPct: 0, lootPct: 0 };
export const EXO_MAX_PER_STAT = 5; // borne dure : l'équilibre reste maîtrisé
export function parseExo(json: string | null): Exo {
  if (!json) return { ...EMPTY_EXO };
  try { const e = JSON.parse(json); return { xpPct: e.xpPct || 0, goldPct: e.goldPct || 0, lootPct: e.lootPct || 0 }; } catch { return { ...EMPTY_EXO }; }
}

// Briser un doublon → le type de rune correspond à l'effet du slot de l'item.
// Nombre de runes selon rareté.
export const RUNES_PER_RARITY: Record<string, number> = { commun: 1, rare: 1, epique: 2, legendaire: 3, mythique: 4 };
export function breakResult(itemKey: string): { type: RuneType; count: number } | null {
  const it = ITEM_BY_KEY[itemKey];
  if (!it) return null;
  return { type: itemEffect(it.slot), count: RUNES_PER_RARITY[it.rarity] ?? 1 };
}

// Application d'une rune : succès 55% (+1%), neutre 25% (rune conservée), échec 20% (rune perdue).
export const FORGE_ODDS = { success: 0.55, neutral: 0.25 }; // le reste = échec
export type ForgeOutcome = "success" | "neutral" | "fail";
export function rollForge(rnd: () => number = Math.random): ForgeOutcome {
  const r = rnd();
  if (r < FORGE_ODDS.success) return "success";
  if (r < FORGE_ODDS.success + FORGE_ODDS.neutral) return "neutral";
  return "fail";
}

const EXO_FIELD: Record<RuneType, keyof Exo> = { xp: "xpPct", gold: "goldPct", loot: "lootPct" };
export function applyRune(exo: Exo, type: RuneType, outcome: ForgeOutcome): { exo: Exo; applied: boolean } {
  if (outcome !== "success") return { exo, applied: false };
  const field = EXO_FIELD[type];
  if (exo[field] >= EXO_MAX_PER_STAT) return { exo, applied: false };
  return { exo: { ...exo, [field]: exo[field] + 1 }, applied: true };
}
export function canReceiveRune(exo: Exo, type: RuneType): boolean {
  return exo[EXO_FIELD[type]] < EXO_MAX_PER_STAT;
}
