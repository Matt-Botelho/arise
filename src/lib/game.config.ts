// Configuration centrale et REGLABLE du Systeme.
// Tout l'equilibrage du jeu vit ici : modifie ces valeurs pour ajuster la difficulte.

export type AttributeDef = {
  code: string;
  name: string;
  icon: string;
  color: string;
  order: number;
};

// Les 9 attributs coeur (renommables cote UI plus tard).
export const ATTRIBUTES: AttributeDef[] = [
  { code: "FOR", name: "Force",        icon: "\u{1F4AA}", color: "#ff4d4d", order: 1 },
  { code: "VIT", name: "Vitalite",     icon: "\u{2764}\u{FE0F}", color: "#ff7a45", order: 2 },
  { code: "INT", name: "Intelligence", icon: "\u{1F4DA}", color: "#4d9bff", order: 3 },
  { code: "VOL", name: "Volonte",      icon: "\u{1F9E0}", color: "#9b6bff", order: 4 },
  { code: "FIN", name: "Finances",     icon: "\u{1F4B0}", color: "#ffd24d", order: 5 },
  { code: "FAM", name: "Famille",      icon: "\u{1F3E0}", color: "#ff6bb5", order: 6 },
  { code: "TRA", name: "Travail",      icon: "\u{2692}\u{FE0F}", color: "#4dd2ff", order: 7 },
  { code: "JAR", name: "Jardinage",    icon: "\u{1F331}", color: "#5cd65c", order: 8 },
  { code: "ART", name: "Artisanat",    icon: "\u{1F3A8}", color: "#c08457", order: 9 },
];

// Courbe d'XP : XP pour passer du niveau L a L+1 = round(BASE * L^EXPONENT).
export const LEVEL_CURVE = {
  base: 100,
  exponent: 1.5,
};

// Rangs de Chasseur, du plus faible au plus fort.
export const RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

// Pour atteindre un rang, CHAQUE attribut doit atteindre ce niveau minimum.
// (F est le rang de depart : pas de seuil.)
export const RANK_THRESHOLDS: Record<Exclude<Rank, "F">, number> = {
  E: 5,
  D: 10,
  C: 20,
  B: 35,
  A: 55,
  S: 80,
};

// Multiplicateur d'XP selon la difficulte d'une quete.
export const DIFFICULTY_MULT: Record<string, number> = {
  E: 1,
  D: 1.5,
  C: 2,
  B: 3,
  A: 5,
  S: 8,
};

// Intensite des penalites (quete obligatoire ratee).
export type PenaltyIntensity = "off" | "douce" | "fidele" | "hardcore";
export const PENALTY_PRESETS: Record<
  PenaltyIntensity,
  { hpLoss: number; xpMalusPct: number; resetStreak: boolean }
> = {
  off:      { hpLoss: 0,  xpMalusPct: 0,    resetStreak: false },
  douce:    { hpLoss: 5,  xpMalusPct: 0,    resetStreak: true  },
  fidele:   { hpLoss: 20, xpMalusPct: 0.1,  resetStreak: true  },
  hardcore: { hpLoss: 40, xpMalusPct: 0.25, resetStreak: true  },
};

export const DEFAULTS = {
  penaltyIntensity: "fidele" as PenaltyIntensity,
  dayRolloverHour: 0,
  startingMaxHp: 100,
  timezone: "Europe/Paris",
};
