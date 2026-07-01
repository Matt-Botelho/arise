// Almanax d'ARISE (inspiration Dofus) : chaque jour, un bonus + une offrande.
// L'offrande accomplie rapporte des Méréons ❖, échangeables au Temple. Logique PURE.
import { ITEM_BY_KEY } from "./lpc-items";

export type Offering = { key: string; title: string; desc: string; mereons: number; gold: number };

// Pool d'offrandes : micro-défis variés, tirés déterministiquement par date.
export const OFFERINGS: Offering[] = [
  { key: "triple_matin", title: "Offrande de l'Aube", desc: "Valide 3 quêtes aujourd'hui.", mereons: 2, gold: 30 },
  { key: "theme_jour", title: "Offrande du Thème", desc: "Valide une quête de l'attribut du jour.", mereons: 2, gold: 25 },
  { key: "obligatoire_tot", title: "Offrande du Devoir", desc: "Valide ta quête obligatoire.", mereons: 1, gold: 20 },
  { key: "cinq_quetes", title: "Offrande du Zèle", desc: "Valide 5 quêtes aujourd'hui.", mereons: 3, gold: 50 },
  { key: "hebdo_step", title: "Offrande de la Semaine", desc: "Coche une étape de mission hebdomadaire.", mereons: 2, gold: 25 },
  { key: "aventure_step", title: "Offrande de l'Aventurier", desc: "Fais avancer un objectif d'Aventure.", mereons: 2, gold: 30 },
  { key: "toutes_quetes", title: "Grande Offrande", desc: "Valide TOUTES tes quêtes du jour.", mereons: 4, gold: 80 },
];
export const OFFERING_BY_KEY: Record<string, Offering> = Object.fromEntries(OFFERINGS.map((o) => [o.key, o]));

// Hash déterministe d'une chaîne (choix stable de l'offrande du jour).
export function dayHash(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) { h ^= day.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function offeringFor(day: string): Offering {
  return OFFERINGS[dayHash(day) % OFFERINGS.length];
}

// État stocké dans Hunter.almanaxJson : { date, offerKey, done }
export type AlmanaxState = { date: string; offerKey: string; done: boolean };
export function almanaxStateFor(day: string, stored: AlmanaxState | null): AlmanaxState {
  if (stored && stored.date === day) return stored;
  return { date: day, offerKey: offeringFor(day).key, done: false };
}

// Vérification PURE de l'offrande du jour, à partir d'un contexte factuel.
export type OfferingCtx = {
  doneToday: number;        // quêtes validées aujourd'hui
  totalActive: number;      // quêtes actives aujourd'hui
  mandatoryDone: boolean;   // l'obligatoire est validée
  themeDone: boolean;       // une quête de l'attribut du jour est validée
  weeklyStep: boolean;      // une étape hebdo cochée aujourd'hui
  objectiveStep: boolean;   // un objectif d'Aventure avancé aujourd'hui
};
export function offeringSatisfied(key: string, ctx: OfferingCtx): boolean {
  if (key === "triple_matin") return ctx.doneToday >= 3;
  if (key === "theme_jour") return ctx.themeDone;
  if (key === "obligatoire_tot") return ctx.mandatoryDone;
  if (key === "cinq_quetes") return ctx.doneToday >= 5;
  if (key === "hebdo_step") return ctx.weeklyStep;
  if (key === "aventure_step") return ctx.objectiveStep;
  if (key === "toutes_quetes") return ctx.totalActive > 0 && ctx.doneToday >= ctx.totalActive;
  return false;
}

// --- Temple de l'Almanax : cosmétiques exclusifs en Méréons ❖ ---
// Ces pièces sont EXCLUES du loot (comme les cosmétiques Éclats et skins de succès).
export const TEMPLE_KEYS: string[] = [
  "headwear_hat_helmet_morion",
  "headwear_hat_helmet_kettle",
  "headwear_hat_helmet_bascinet_round",
];
export const TEMPLE_SET = new Set(TEMPLE_KEYS);
export const TEMPLE_COST: Record<string, number> = {
  headwear_hat_helmet_morion: 30,
  headwear_hat_helmet_kettle: 45,
  headwear_hat_helmet_bascinet_round: 60,
};
export type TempleItem = { key: string; name: string; slot: string; rarity: string; cost: number };
export const TEMPLE_ITEMS: TempleItem[] = TEMPLE_KEYS
  .map((k) => ITEM_BY_KEY[k])
  .filter((it): it is NonNullable<typeof it> => Boolean(it))
  .map((it) => ({ key: it.key, name: it.name, slot: it.slot, rarity: it.rarity, cost: TEMPLE_COST[it.key] ?? 40 }));
