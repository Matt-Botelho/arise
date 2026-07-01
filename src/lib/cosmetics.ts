// Boutique cosmétique en Éclats ✦ — skins de prestige exclusifs.
// Ces pièces ne tombent JAMAIS en loot : les Éclats sont le seul moyen de les obtenir.
import { ITEM_BY_KEY } from "./lpc-items";

// Coût en Éclats par rareté.
export const SHARD_COST: Record<string, number> = { rare: 8, epique: 15, legendaire: 30, mythique: 60 };
export function shardCost(rarity: string): number { return SHARD_COST[rarity] ?? 20; }

// Clés exclusives à la boutique d'Éclats (exclues du loot et des donjons).
export const COSMETIC_KEYS: string[] = [
  "headwear_hat_helmet_legion",
  "headwear_hat_helmet_barbarian_viking",
  "legs_skirts_legion",
  "headwear_hat_helmet_horned",
  "weapon_halberd",
  "weapon_scythe",
];
export const COSMETIC_SET = new Set(COSMETIC_KEYS);
export function isCosmetic(key: string): boolean { return COSMETIC_SET.has(key); }

export type Cosmetic = { key: string; name: string; slot: string; rarity: string; cost: number };
export const COSMETICS: Cosmetic[] = COSMETIC_KEYS
  .map((k) => ITEM_BY_KEY[k])
  .filter((it): it is NonNullable<typeof it> => Boolean(it))
  .map((it) => ({ key: it.key, name: it.name, slot: it.slot, rarity: it.rarity, cost: shardCost(it.rarity) }));
export const COSMETIC_BY_KEY: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((c) => [c.key, c]));
