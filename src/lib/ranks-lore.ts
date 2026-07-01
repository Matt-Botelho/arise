// Titres et narration de passage de rang (donjons cérémoniaux).
export const RANK_TITLES: Record<string, string> = {
  F: "Le Faible",
  E: "L'Éveillé",
  D: "Chasseur Confirmé",
  C: "Chasseur d'Élite",
  B: "Vétéran",
  A: "Maître Chasseur",
  S: "Souverain",
  "S+": "Monarque",
  SS: "Roi des Ombres",
  "SS Elite": "Monarque Suprême",
};

export const RANK_INTRO: Record<string, string> = {
  E: "Le Système a perçu une étincelle en toi. Prouve que tu n'es plus Le Faible.",
  D: "Ta constance attire l'attention du Système. Affronte l'épreuve de confirmation.",
  C: "Les portes de l'élite s'entrouvrent. Montre ta vraie valeur.",
  B: "Peu parviennent jusqu'ici. L'épreuve du vétéran t'attend.",
  A: "La maîtrise se mérite. Franchis le seuil des Maîtres.",
  S: "Le rang des Souverains t'appelle. Domine l'épreuve.",
  "S+": "Au-delà des Souverains : deviens un Monarque.",
  SS: "L'ombre te reconnaît comme son roi. Scelle ton règne.",
  "SS Elite": "L'ultime palier. Deviens le Monarque Suprême.",
};

export function rankAccent(rankIndex: number): string {
  if (rankIndex >= 8) return "#ff5d7a";
  if (rankIndex >= 6) return "#ffcf4d";
  if (rankIndex >= 3) return "#b06bff";
  return "#38e1ff";
}
