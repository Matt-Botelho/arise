// Serments (inspiration Idoles de Dofus) : contraintes auto-imposées le matin,
// qui multiplient les gains du jour. Échec = petite pénalité au tick. Logique PURE.

export type OathDef = {
  key: string;
  name: string;
  desc: string;
  icon: string;
  xpMult: number;   // multiplicateur appliqué immédiatement aux quêtes du jour
  goldMult: number;
  // Échec évalué au tick (voir checkOath) : pénalité fixe.
  failHp: number;
  failGold: number;
};

export const OATHS: OathDef[] = [
  { key: "aube", name: "Serment de l'Aube", desc: "Valider ta quête obligatoire avant 14h.", icon: "🌅", xpMult: 1.2, goldMult: 1.2, failHp: 8, failGold: 30 },
  { key: "conquerant", name: "Serment du Conquérant", desc: "Valider TOUTES tes quêtes du jour.", icon: "⚔️", xpMult: 1.35, goldMult: 1.25, failHp: 12, failGold: 50 },
  { key: "acier", name: "Serment d'Acier", desc: "Valider au moins 5 quêtes aujourd'hui.", icon: "🛡️", xpMult: 1.25, goldMult: 1.2, failHp: 10, failGold: 40 },
];
export const OATH_BY_KEY: Record<string, OathDef> = Object.fromEntries(OATHS.map((o) => [o.key, o]));
export const MAX_OATHS_PER_DAY = 2;

// État stocké dans Hunter.oathsJson : { date, keys }
export type OathsState = { date: string; keys: string[] };
export function oathsStateFor(day: string, stored: OathsState | null): OathsState {
  if (stored && stored.date === day) return stored;
  return { date: day, keys: [] };
}

// Multiplicateurs cumulés des serments actifs (multiplicatif).
export function oathMultipliers(keys: string[]): { xp: number; gold: number } {
  let xp = 1, gold = 1;
  for (const k of keys) {
    const o = OATH_BY_KEY[k];
    if (!o) continue;
    xp *= o.xpMult; gold *= o.goldMult;
  }
  return { xp, gold };
}

// Vérification d'un serment à la bascule de journée.
// ctx : données du jour écoulé.
export type OathCtx = {
  doneCount: number;                 // quêtes validées (status done)
  totalActive: number;               // quêtes actives ce jour-là
  mandatoryDoneBeforeHour: boolean;  // l'obligatoire validée avant 14h locale
};
export function checkOath(key: string, ctx: OathCtx): boolean {
  if (key === "aube") return ctx.mandatoryDoneBeforeHour;
  if (key === "conquerant") return ctx.totalActive > 0 && ctx.doneCount >= ctx.totalActive;
  if (key === "acier") return ctx.doneCount >= 5;
  return true;
}
