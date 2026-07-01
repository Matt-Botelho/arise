// Panoplies (inspiration Dofus, âme Solo Leveling). Logique PURE et testable.
// Chaque panoplie regroupe des pièces de SLOTS DIFFÉRENTS (portables ensemble) ;
// le bonus croît avec le nombre de pièces ÉQUIPÉES. Panoplie complète = aura sur l'avatar.
import { ITEM_BY_KEY, EQUIP_SLOTS, type Equipped } from "./lpc-items";

export type SetBonusTier = { pieces: number; xpPct: number; goldPct: number; lootPct: number };
export type ItemSet = {
  key: string;
  name: string;
  lore: string;
  color: string;         // couleur de l'aura / de l'affichage
  items: string[];       // clés LPC, slots distincts
  tiers: SetBonusTier[]; // bonus par nombre de pièces équipées (croissant)
};

export const SETS: ItemSet[] = [
  {
    key: "vagabond",
    name: "Tenue du Vagabond",
    lore: "Celui qui marche sans rang ni gloire, mais ne s'arrête jamais.",
    color: "#4d9bff",
    items: ["cape_cape_solid", "feet_boots_basic", "legs_formal", "hair_beards_5oclock_shadow"],
    tiers: [
      { pieces: 2, xpPct: 3, goldPct: 0, lootPct: 0 },
      { pieces: 3, xpPct: 5, goldPct: 3, lootPct: 0 },
      { pieces: 4, xpPct: 8, goldPct: 5, lootPct: 3 },
    ],
  },
  {
    key: "chevalier",
    name: "Panoplie du Chevalier d'Acier",
    lore: "Forgée pour ceux qui tiennent la ligne quand les autres reculent.",
    color: "#b06bff",
    items: ["headwear_hat_helmet_armet", "torso_clothes_longsleeve_formal_striped", "legs_formal_striped", "feet_boots_fold"],
    tiers: [
      { pieces: 2, xpPct: 4, goldPct: 0, lootPct: 0 },
      { pieces: 3, xpPct: 6, goldPct: 4, lootPct: 2 },
      { pieces: 4, xpPct: 10, goldPct: 6, lootPct: 4 },
    ],
  },
  {
    key: "faucheur",
    name: "Panoplie du Faucheur",
    lore: "L'ombre qui récolte ce que la discipline a semé.",
    color: "#ff5d7a",
    items: ["weapon_scythe", "headwear_hat_helmet_close", "feet_boots_revised", "cape_cape_tattered"],
    tiers: [
      { pieces: 2, xpPct: 4, goldPct: 2, lootPct: 0 },
      { pieces: 3, xpPct: 7, goldPct: 4, lootPct: 3 },
      { pieces: 4, xpPct: 11, goldPct: 6, lootPct: 6 },
    ],
  },
  {
    key: "legionnaire",
    name: "Panoplie du Légionnaire",
    lore: "L'uniforme des armées d'ombres du Monarque. Ne se donne pas : se mérite.",
    color: "#ffcf4d",
    items: ["headwear_hat_helmet_legion", "legs_skirts_legion", "weapon_halberd", "cape_cape_trim"],
    tiers: [
      { pieces: 2, xpPct: 5, goldPct: 3, lootPct: 0 },
      { pieces: 3, xpPct: 8, goldPct: 5, lootPct: 4 },
      { pieces: 4, xpPct: 12, goldPct: 8, lootPct: 6 },
    ],
  },
  {
    key: "berserker",
    name: "Panoplie du Berserker",
    lore: "La rage domptée, transformée en constance. La plus dure à assembler.",
    color: "#ff7a45",
    items: ["headwear_hat_helmet_barbarian_viking", "weapon_waraxe", "legs_fur", "hair_beards_winter"],
    tiers: [
      { pieces: 2, xpPct: 5, goldPct: 0, lootPct: 3 },
      { pieces: 3, xpPct: 8, goldPct: 4, lootPct: 5 },
      { pieces: 4, xpPct: 12, goldPct: 6, lootPct: 8 },
    ],
  },
  {
    key: "monarque",
    name: "Panoplie du Monarque des Ombres",
    lore: "Réservée à celui qui a tout accompli. Lève-toi.",
    color: "#38e1ff",
    items: ["headwear_hat_helmet_maximus", "weapon_mace", "feet_boots_rim", "torso_clothes_longsleeve_formal"],
    tiers: [
      { pieces: 2, xpPct: 6, goldPct: 4, lootPct: 2 },
      { pieces: 3, xpPct: 10, goldPct: 6, lootPct: 5 },
      { pieces: 4, xpPct: 15, goldPct: 10, lootPct: 8 },
    ],
  },
];
export const SET_BY_KEY: Record<string, ItemSet> = Object.fromEntries(SETS.map((s) => [s.key, s]));
export const SET_BY_ITEM: Record<string, ItemSet> = {};
for (const s of SETS) for (const k of s.items) SET_BY_ITEM[k] = s;

// Nombre de pièces d'une panoplie actuellement ÉQUIPÉES.
export function equippedSetPieces(set: ItemSet, equipped: Equipped): number {
  let n = 0;
  for (const slot of EQUIP_SLOTS) {
    const sel = equipped[slot];
    if (sel && sel.key && set.items.includes(sel.key)) n++;
  }
  return n;
}

// Bonus de panoplies cumulés sur l'équipement porté + panoplies complètes (pour l'aura).
export type SetBonuses = { xpPct: number; goldPct: number; lootPct: number; completed: string[]; active: { key: string; name: string; color: string; pieces: number; total: number }[] };
export function computeSetBonuses(equipped: Equipped): SetBonuses {
  let xp = 0, gold = 0, loot = 0;
  const completed: string[] = [];
  const active: SetBonuses["active"] = [];
  for (const s of SETS) {
    const n = equippedSetPieces(s, equipped);
    if (n < 2) continue;
    const tier = [...s.tiers].reverse().find((t) => n >= t.pieces);
    if (tier) { xp += tier.xpPct; gold += tier.goldPct; loot += tier.lootPct; }
    if (n >= s.items.length) completed.push(s.key);
    active.push({ key: s.key, name: s.name, color: s.color, pieces: n, total: s.items.length });
  }
  return { xpPct: xp, goldPct: gold, lootPct: loot, completed, active };
}

// Progression de collection (pièces POSSÉDÉES, pour l'UI "3/4").
export function setProgress(set: ItemSet, ownedKeys: Set<string> | string[]): { owned: number; total: number } {
  const have = ownedKeys instanceof Set ? ownedKeys : new Set(ownedKeys);
  return { owned: set.items.filter((k) => have.has(k)).length, total: set.items.length };
}

// --- Lore des items (cartes de loot) ---
const LORE: Record<string, string> = {
  weapon_scythe: "On dit qu'elle fauche les excuses avant les ennemis.",
  weapon_halberd: "Arme d'élite des gardes de la Porte Rouge.",
  weapon_waraxe: "Deux cents quêtes ont affûté son tranchant.",
  weapon_mace: "Mille validations. Aucune n'a été de trop.",
  headwear_hat_helmet_legion: "Casque des légions d'ombres. Il murmure : continue.",
  headwear_hat_helmet_maximus: "Porté par le premier à avoir atteint le rang S.",
  headwear_hat_helmet_barbarian_viking: "Le froid des matins d'entraînement l'a forgé.",
  headwear_hat_helmet_greathelm: "Il ne protège pas la tête. Il protège la volonté.",
  cape_cape_trim: "Trente jours sans faillir tissent ce genre d'étoffe.",
  cape_cape_tattered: "Déchirée par cent jours de combat. Encore debout.",
  legs_fur: "La puissance brute se moque de l'élégance.",
  legs_skirts_legion: "Tenue de parade des armées du Monarque.",
  hair_beards_winter: "La sagesse pousse sur les visages patients.",
};
const GENERIC_LORE: Record<string, string[]> = {
  rare: ["Trouvé sur le seuil d'une Porte de rang D.", "Un artefact mineur, mais le Système l'a jugé digne.", "Son précédent porteur a abandonné. Pas toi."],
  epique: ["Extrait d'un donjon que peu ont terminé.", "Le Système le réservait à un Chasseur régulier.", "Il vibre encore de l'énergie d'une Porte."],
  legendaire: ["Une relique d'avant l'Éveil. Rarissime.", "Les Chasseurs de rang S en parlent à voix basse.", "Le Système a hésité avant de te l'accorder."],
  mythique: ["Un fragment de la volonté du Monarque lui-même.", "Il n'en existe qu'une poignée dans tous les mondes."],
};
export function loreFor(itemKey: string, rarity: string): string {
  if (LORE[itemKey]) return LORE[itemKey];
  const pool = GENERIC_LORE[rarity] || GENERIC_LORE.rare;
  let h = 0;
  for (let i = 0; i < itemKey.length; i++) h = (h * 31 + itemKey.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

// Garde-fou : vérifie que chaque panoplie n'a qu'une pièce par slot et des clés valides.
export function validateSets(): string[] {
  const errors: string[] = [];
  for (const s of SETS) {
    const slots = new Set<string>();
    for (const k of s.items) {
      const it = ITEM_BY_KEY[k];
      if (!it) { errors.push(s.key + ": clé inconnue " + k); continue; }
      if (slots.has(it.slot)) errors.push(s.key + ": slot en double " + it.slot);
      slots.add(it.slot);
    }
  }
  return errors;
}
