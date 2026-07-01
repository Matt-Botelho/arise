// Note de semaine (ladder contre soi-même, inspiration Kolizéum solo).
// Calculée au tick du lundi sur la semaine écoulée. Logique PURE.

export type WeekGrade = "S" | "A" | "B" | "C";
export const GRADE_COLOR: Record<WeekGrade, string> = { S: "#ffcf4d", A: "#38e1ff", B: "#4d9bff", C: "#9aa7b3" };

export type WeekCtx = {
  done: number;        // validations réussies sur la semaine
  failed: number;      // quêtes obligatoires ratées
  perfectDays: number; // journées sans échec (avec au moins 1 obligatoire)
};

// Score simple et lisible : chaque validation compte, les jours parfaits paient, les échecs coûtent.
export function weekScore(ctx: WeekCtx): number {
  return Math.max(0, ctx.done * 10 + ctx.perfectDays * 25 - ctx.failed * 15);
}
export function weekGrade(score: number): WeekGrade {
  if (score >= 400) return "S";
  if (score >= 250) return "A";
  if (score >= 120) return "B";
  return "C";
}

// Récompense si record personnel battu.
export const RECORD_REWARD = { gold: 150, shards: 3 };
