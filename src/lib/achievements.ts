// Succes / titres deblocables. Logique PURE et testable.
export type AchCtx = {
  rankIndex: number;       // 0=F .. 6=S
  globalLevel: number;
  maxAttrLevel: number;
  minAttrLevel: number;
  totalPower: number;
  streak: number;
  questsDone: number;
  dungeonsCleared: number;
  // V2 : nouveaux systèmes
  gatesCleared: number;    // Portes franchies
  setsOwned: number;       // panoplies complètes POSSÉDÉES
  shadowEssence: number;   // essence de l'Ombre
  mereons: number;         // Méréons ❖ en poche
  bestWeekScore: number;   // record de note de semaine
};

export type Tier = "bronze" | "argent" | "or" | "legendaire";
export const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", argent: "Argent", or: "Or", legendaire: "Légendaire" };
export const TIER_COLOR: Record<Tier, string> = { bronze: "#cd7f32", argent: "#c0c0c0", or: "#ffcf4d", legendaire: "#ff5d7a" };

export type Reward = { gold: number; shards: number; skin?: string };

export type AchievementDef = {
  key: string;
  name: string;        // sert aussi de titre equipable
  description: string;
  icon: string;
  tier: Tier;
  reward: Reward;
  check: (c: AchCtx) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Bronze ---
  { key: "first_quest", name: "Premier Pas", description: "Compléter ta première quête", icon: "⚡", tier: "bronze", reward: { gold: 50, shards: 0 }, check: (c) => c.questsDone >= 1 },
  { key: "quests_10", name: "Échauffement", description: "10 quêtes complétées", icon: "🌱", tier: "bronze", reward: { gold: 60, shards: 0 }, check: (c) => c.questsDone >= 10 },
  { key: "streak_3", name: "Mise en route", description: "Série de 3 jours", icon: "📅", tier: "bronze", reward: { gold: 60, shards: 0 }, check: (c) => c.streak >= 3 },
  { key: "rank_E", name: "L'Éveillé", description: "Atteindre le rang E", icon: "🆙", tier: "bronze", reward: { gold: 80, shards: 0 }, check: (c) => c.rankIndex >= 1 },
  { key: "dungeon_1", name: "Briseur de Donjon", description: "Terminer un donjon", icon: "🏰", tier: "bronze", reward: { gold: 80, shards: 1 }, check: (c) => c.dungeonsCleared >= 1 },

  // --- Argent ---
  { key: "quests_50", name: "Habitué du Système", description: "50 quêtes complétées", icon: "📜", tier: "argent", reward: { gold: 150, shards: 3 }, check: (c) => c.questsDone >= 50 },
  { key: "streak_7", name: "Régularité", description: "Série de 7 jours", icon: "🗓️", tier: "argent", reward: { gold: 150, shards: 3 }, check: (c) => c.streak >= 7 },
  { key: "attr_10", name: "Spécialiste", description: "Un attribut au niveau 10", icon: "💠", tier: "argent", reward: { gold: 150, shards: 3 }, check: (c) => c.maxAttrLevel >= 10 },
  { key: "balanced_5", name: "Équilibre", description: "Tous les attributs au niveau 5+", icon: "⚖️", tier: "argent", reward: { gold: 180, shards: 5 }, check: (c) => c.minAttrLevel >= 5 },
  { key: "rank_D", name: "Chasseur Confirmé", description: "Atteindre le rang D", icon: "🎖️", tier: "argent", reward: { gold: 200, shards: 5 }, check: (c) => c.rankIndex >= 2 },
  { key: "level_25", name: "Ascension", description: "Niveau global 25", icon: "📈", tier: "argent", reward: { gold: 200, shards: 5 }, check: (c) => c.globalLevel >= 25 },

  // --- Or (avec skin exclusif) ---
  { key: "quests_200", name: "Infatigable", description: "200 quêtes complétées", icon: "🔥", tier: "or", reward: { gold: 300, shards: 8, skin: "weapon_waraxe" }, check: (c) => c.questsDone >= 200 },
  { key: "streak_30", name: "Discipline de Monarque", description: "Série de 30 jours", icon: "👑", tier: "or", reward: { gold: 300, shards: 10, skin: "cape_cape_trim" }, check: (c) => c.streak >= 30 },
  { key: "rank_B", name: "Chasseur d'Élite", description: "Atteindre le rang B", icon: "⭐", tier: "or", reward: { gold: 300, shards: 8, skin: "headwear_hat_helmet_greathelm" }, check: (c) => c.rankIndex >= 4 },
  { key: "power_100", name: "Puissance 100", description: "Puissance totale de 100", icon: "💥", tier: "or", reward: { gold: 300, shards: 8, skin: "legs_fur" }, check: (c) => c.totalPower >= 100 },
  { key: "balanced_10", name: "Maître Polyvalent", description: "Tous les attributs au niveau 10+", icon: "🧩", tier: "or", reward: { gold: 350, shards: 10, skin: "torso_clothes_longsleeve_formal" }, check: (c) => c.minAttrLevel >= 10 },
  { key: "dungeon_10", name: "Conquérant", description: "Terminer 10 donjons", icon: "🗡️", tier: "or", reward: { gold: 350, shards: 10, skin: "feet_boots_rim" }, check: (c) => c.dungeonsCleared >= 10 },

  // --- V2 : Portes, Ombre, Panoplies, Temple, Semaines ---
  { key: "gate_1", name: "Franchisseur", description: "Franchir ta première Porte", icon: "⛩️", tier: "bronze", reward: { gold: 60, shards: 0 }, check: (c) => c.gatesCleared >= 1 },
  { key: "shadow_7", name: "Éveilleur d'Ombre", description: "Ton Ombre atteint le stade Loup (7 jours parfaits)", icon: "🐺", tier: "argent", reward: { gold: 150, shards: 3 }, check: (c) => c.shadowEssence >= 7 },
  { key: "set_first", name: "Collectionneur", description: "Posséder une panoplie complète", icon: "🧥", tier: "argent", reward: { gold: 180, shards: 5 }, check: (c) => c.setsOwned >= 1 },
  { key: "mereons_30", name: "Fidèle du Temple", description: "Détenir 30 Méréons ❖", icon: "❖", tier: "argent", reward: { gold: 150, shards: 3 }, check: (c) => c.mereons >= 30 },
  { key: "gates_15", name: "Gardien des Portes", description: "Franchir 15 Portes", icon: "🚪", tier: "or", reward: { gold: 300, shards: 8, skin: "headwear_hat_helmet_barbuta" }, check: (c) => c.gatesCleared >= 15 },
  { key: "shadow_30", name: "Maître des Ombres", description: "Ton Ombre atteint le stade Garou (30 jours parfaits)", icon: "🌑", tier: "or", reward: { gold: 350, shards: 10, skin: "headwear_hat_helmet_mail" }, check: (c) => c.shadowEssence >= 30 },
  { key: "week_S", name: "Semaine Parfaite", description: "Obtenir une note de semaine S (400+ pts)", icon: "🏅", tier: "or", reward: { gold: 300, shards: 8, skin: "headwear_hat_helmet_flattop" }, check: (c) => c.bestWeekScore >= 400 },
  { key: "sets_3", name: "Grand Collectionneur", description: "Posséder 3 panoplies complètes", icon: "👘", tier: "legendaire", reward: { gold: 600, shards: 20, skin: "headwear_hat_helmet_bascinet" }, check: (c) => c.setsOwned >= 3 },

  // --- Légendaire (skin rare) ---
  { key: "rank_S", name: "Souverain", description: "Atteindre le rang S", icon: "🌟", tier: "legendaire", reward: { gold: 600, shards: 20, skin: "headwear_hat_helmet_maximus" }, check: (c) => c.rankIndex >= 6 },
  { key: "attr_25", name: "Prodige", description: "Un attribut au niveau 25", icon: "🔮", tier: "legendaire", reward: { gold: 500, shards: 15, skin: "hair_beards_winter" }, check: (c) => c.maxAttrLevel >= 25 },
  { key: "streak_100", name: "Légende Vivante", description: "Série de 100 jours", icon: "♾️", tier: "legendaire", reward: { gold: 800, shards: 30, skin: "cape_cape_tattered" }, check: (c) => c.streak >= 100 },
  { key: "quests_1000", name: "Machine du Système", description: "1000 quêtes complétées", icon: "⚙️", tier: "legendaire", reward: { gold: 800, shards: 30, skin: "weapon_mace" }, check: (c) => c.questsDone >= 1000 },
  { key: "level_100", name: "Le Sommet", description: "Niveau global 100", icon: "🏔️", tier: "legendaire", reward: { gold: 1000, shards: 40, skin: "headwear_hat_helmet_barbarian" }, check: (c) => c.globalLevel >= 100 },
];

// Skins débloqués UNIQUEMENT par les succès — exclus du loot (comme les cosmétiques Éclats).
export const ACHIEVEMENT_SKINS = new Set(
  ACHIEVEMENTS.map((a) => a.reward.skin).filter((s): s is string => Boolean(s))
);

export function evaluateAchievements(ctx: AchCtx) {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.check(ctx) }));
}

// Progression d'un donjon a partir de ses etapes.
export type DungeonStep = { label: string; done: boolean };
export function dungeonProgress(steps: DungeonStep[]) {
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  return { done, total, cleared: total > 0 && done === total, ratio: total > 0 ? done / total : 0 };
}
