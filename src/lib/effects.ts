// Effets passifs de l'équipement (bonus selon slot + rareté + amélioration).
import { ITEM_BY_KEY, EQUIP_SLOTS, type Equipped } from "./lpc-items";

const RARITY_MAG: Record<string, number> = { base: 0, commun: 2, rare: 4, epique: 7, legendaire: 11, mythique: 16 };
const SLOT_EFFECT: Record<string, "xp" | "gold" | "loot"> = {
  weapon: "xp", legs: "xp", hair: "xp", torso: "gold", feet: "gold", headwear: "loot", cape: "loot",
};

export type Bonuses = { xpPct: number; goldPct: number; lootPct: number };

export function itemMagnitude(rarity: string, plus = 0): number {
  return (RARITY_MAG[rarity] ?? 0) + Math.max(0, plus);
}
export function itemEffect(slot: string): "xp" | "gold" | "loot" {
  return SLOT_EFFECT[slot] ?? "xp";
}

export function computeBonuses(equipped: Equipped, plusByKey: Record<string, number> = {}): Bonuses {
  let xp = 0, gold = 0, loot = 0;
  for (const slot of EQUIP_SLOTS) {
    const sel = equipped[slot];
    if (!sel || !sel.key) continue;
    const it = ITEM_BY_KEY[sel.key];
    if (!it) continue;
    const mag = itemMagnitude(it.rarity, plusByKey[sel.key] ?? 0);
    const eff = itemEffect(slot);
    if (eff === "xp") xp += mag; else if (eff === "gold") gold += mag; else loot += mag;
  }
  return { xpPct: xp, goldPct: gold, lootPct: loot };
}

export const UPGRADE_MAX = 5;
export function upgradeCost(plus: number): number { return 50 * (plus + 1); }
