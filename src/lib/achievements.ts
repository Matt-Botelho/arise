// Succes / titres deblocables. Logique PURE et testable.
export type AchCtx = {
  rankIndex: number;       // 0=F .. 6=S
  maxAttrLevel: number;
  minAttrLevel: number;
  totalPower: number;
  streak: number;
  questsDone: number;
  dungeonsCleared: number;
};

export type AchievementDef = {
  key: string;
  name: string;
  description: string;
  icon: string;
  check: (c: AchCtx) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_quest", name: "Premier Pas", description: "Compléter ta première quête", icon: "⚡", check: (c) => c.questsDone >= 1 },
  { key: "quests_50", name: "Habitué du Système", description: "50 quêtes complétées", icon: "📜", check: (c) => c.questsDone >= 50 },
  { key: "quests_200", name: "Infatigable", description: "200 quêtes complétées", icon: "🔥", check: (c) => c.questsDone >= 200 },
  { key: "streak_7", name: "Régularité", description: "Série de 7 jours", icon: "🗓️", check: (c) => c.streak >= 7 },
  { key: "streak_30", name: "Discipline de Monarque", description: "Série de 30 jours", icon: "👑", check: (c) => c.streak >= 30 },
  { key: "rank_E", name: "Sorti du rang F", description: "Atteindre le rang E", icon: "🆙", check: (c) => c.rankIndex >= 1 },
  { key: "rank_B", name: "Chasseur d'élite", description: "Atteindre le rang B", icon: "⭐", check: (c) => c.rankIndex >= 4 },
  { key: "attr_10", name: "Spécialiste", description: "Un attribut au niveau 10", icon: "💠", check: (c) => c.maxAttrLevel >= 10 },
  { key: "balanced_5", name: "Équilibre", description: "Tous les attributs au niveau 5+", icon: "⚖️", check: (c) => c.minAttrLevel >= 5 },
  { key: "power_100", name: "Puissance 100", description: "Puissance totale de 100", icon: "💥", check: (c) => c.totalPower >= 100 },
  { key: "dungeon_1", name: "Briseur de Donjon", description: "Terminer un donjon", icon: "🏰", check: (c) => c.dungeonsCleared >= 1 },
];

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
