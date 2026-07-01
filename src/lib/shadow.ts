// L'Ombre-compagnon (fidèle à Solo Leveling : le Monarque relève des ombres).
// Elle se nourrit de ta régularité : +1 Essence chaque journée parfaite (tick).
// Elle ne meurt JAMAIS : si tu rates, elle s'assombrit et son bonus s'endort. Logique PURE.

export type ShadowStage = { key: string; at: number; name: string; xpPct: number; desc: string };
export const SHADOW_STAGES: ShadowStage[] = [
  { key: "naissante", at: 0, name: "Ombre naissante", xpPct: 1, desc: "Une silhouette frémit à tes pieds." },
  { key: "loup", at: 7, name: "Loup d'ombre", xpPct: 2, desc: "Sept jours de constance lui ont donné des crocs." },
  { key: "garou", at: 30, name: "Garou spectral", xpPct: 4, desc: "Trente jours. Elle se tient debout, comme toi." },
  { key: "monarque", at: 90, name: "Ombre du Monarque", xpPct: 6, desc: "Quatre-vingt-dix jours. Elle s'incline devant personne, sauf toi." },
];

// État stocké dans Hunter.shadowJson : { essence, lastFedDay }
export type ShadowState = { essence: number; lastFedDay: string | null };
export const DEFAULT_SHADOW: ShadowState = { essence: 0, lastFedDay: null };

export function stageFor(essence: number): ShadowStage {
  let cur = SHADOW_STAGES[0];
  for (const s of SHADOW_STAGES) if (essence >= s.at) cur = s;
  return cur;
}
export function nextStage(essence: number): ShadowStage | null {
  for (const s of SHADOW_STAGES) if (essence < s.at) return s;
  return null;
}

// Nourrie = journée parfaite hier ou aujourd'hui → bonus actif, apparence lumineuse.
export function isFed(state: ShadowState, today: string, yesterday: string): boolean {
  return state.lastFedDay === today || state.lastFedDay === yesterday;
}

// Nourrit l'ombre pour une journée parfaite (idempotent par jour).
export function feed(state: ShadowState, day: string): { state: ShadowState; evolved: ShadowStage | null } {
  if (state.lastFedDay === day) return { state, evolved: null };
  const before = stageFor(state.essence);
  const after = { essence: state.essence + 1, lastFedDay: day };
  const now = stageFor(after.essence);
  return { state: after, evolved: now.key !== before.key ? now : null };
}

// Bonus passif : xpPct du stade si nourrie, 0 sinon.
export function shadowBonus(state: ShadowState, today: string, yesterday: string): number {
  return isFed(state, today, yesterday) ? stageFor(state.essence).xpPct : 0;
}
