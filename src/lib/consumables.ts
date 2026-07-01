// Consommables : boosts/protections lootables ou achetables.
export type ConsumableKind = "passive" | "buff";
export type ConsumableDef = { key: string; name: string; desc: string; price: number; kind: ConsumableKind; icon: string };

export const CONSUMABLES: ConsumableDef[] = [
  { key: "streak_shield", name: "Bouclier de série", desc: "Protège ta série si tu rates une journée.", price: 300, kind: "passive", icon: "🛡️" },
  { key: "penalty_ward", name: "Protection du Système", desc: "Annule les pénalités d'un jour raté.", price: 250, kind: "passive", icon: "✨" },
  { key: "xp_potion", name: "Potion d'XP", desc: "×2 XP gagné pendant 24 h.", price: 200, kind: "buff", icon: "⚗️" },
  { key: "luck_charm", name: "Talisman de chance", desc: "×2 chance de loot pendant 24 h.", price: 200, kind: "buff", icon: "🍀" },
];
export const CONSUMABLE_BY_KEY: Record<string, ConsumableDef> = Object.fromEntries(CONSUMABLES.map((c) => [c.key, c]));
export const BUFF_HOURS = 24;
export const BUFF_FIELD: Record<string, string> = { xp_potion: "xp2xUntil", luck_charm: "luck2xUntil" };
