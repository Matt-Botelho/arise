// Quêtes suggérées par domaine, pour l'onboarding et la création d'objectifs.
export type QuestTemplate = { title: string; baseXp: number; difficulty: string };

export const SUGGESTIONS: Record<string, QuestTemplate[]> = {
  FOR: [
    { title: "30 min de sport", baseXp: 80, difficulty: "D" },
    { title: "50 pompes", baseXp: 50, difficulty: "E" },
    { title: "10 000 pas", baseXp: 60, difficulty: "D" },
    { title: "Séance de muscu", baseXp: 90, difficulty: "C" },
  ],
  VIT: [
    { title: "8 h de sommeil", baseXp: 50, difficulty: "E" },
    { title: "Boire 2 L d'eau", baseXp: 30, difficulty: "E" },
    { title: "Repas équilibré", baseXp: 40, difficulty: "E" },
    { title: "Pas d'écran 1 h avant de dormir", baseXp: 50, difficulty: "D" },
  ],
  INT: [
    { title: "Lire 20 pages", baseXp: 50, difficulty: "E" },
    { title: "1 h d'étude / compétence", baseXp: 80, difficulty: "D" },
    { title: "1 leçon de code", baseXp: 70, difficulty: "D" },
    { title: "Suivre un cours", baseXp: 50, difficulty: "E" },
  ],
  VOL: [
    { title: "Méditer 10 min", baseXp: 40, difficulty: "E" },
    { title: "Routine matinale", baseXp: 50, difficulty: "E" },
    { title: "2 h sans réseaux sociaux", baseXp: 60, difficulty: "D" },
    { title: "Journaling du soir", baseXp: 40, difficulty: "E" },
  ],
  FIN: [
    { title: "Noter ses dépenses", baseXp: 30, difficulty: "E" },
    { title: "Vérifier son budget", baseXp: 40, difficulty: "E" },
    { title: "Mettre une somme de côté", baseXp: 60, difficulty: "D" },
    { title: "1 action pour ses revenus", baseXp: 80, difficulty: "C" },
  ],
  FAM: [
    { title: "Appeler un proche", baseXp: 40, difficulty: "E" },
    { title: "Repas en famille", baseXp: 50, difficulty: "E" },
    { title: "Activité avec un proche", baseXp: 60, difficulty: "D" },
    { title: "Prendre des nouvelles d'un ami", baseXp: 30, difficulty: "E" },
  ],
  TRA: [
    { title: "2 h de deep work", baseXp: 90, difficulty: "C" },
    { title: "Avancer une tâche clé", baseXp: 60, difficulty: "D" },
    { title: "Boîte mail à zéro", baseXp: 40, difficulty: "E" },
    { title: "Planifier sa journée", baseXp: 30, difficulty: "E" },
  ],
  JAR: [
    { title: "Arroser / entretenir 15 min", baseXp: 30, difficulty: "E" },
    { title: "Désherber", baseXp: 40, difficulty: "E" },
    { title: "Planter quelque chose", baseXp: 50, difficulty: "D" },
  ],
  ART: [
    { title: "30 min sur un projet créatif", baseXp: 50, difficulty: "E" },
    { title: "Avancer une création", baseXp: 60, difficulty: "D" },
    { title: "Terminer une pièce", baseXp: 80, difficulty: "C" },
  ],
};
