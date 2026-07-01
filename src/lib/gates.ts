// Les Portes (inspiration chasses au trésor Dofus + Portes de Solo Leveling) :
// chaque matin, 1 chance sur 3 qu'une Porte s'ouvre — micro-épreuve surprise,
// tirée du pool configuré, expirant à la fin du jour. Logique PURE.

export type GateRankDef = { rank: string; weight: number; goldMult: number; xpMult: number; label: string };
export const GATE_RANKS: GateRankDef[] = [
  { rank: "D", weight: 50, goldMult: 1, xpMult: 1, label: "Porte de rang D" },
  { rank: "C", weight: 30, goldMult: 1.6, xpMult: 1.5, label: "Porte de rang C" },
  { rank: "B", weight: 14, goldMult: 2.4, xpMult: 2.2, label: "Porte de rang B" },
  { rank: "A", weight: 5, goldMult: 4, xpMult: 3.5, label: "Porte de rang A" },
  { rank: "S", weight: 1, goldMult: 7, xpMult: 6, label: "⚠ Porte ROUGE (rang S)" },
];

export const GATE_SPAWN_CHANCE = 1 / 3;
export const GATE_BASE_GOLD = 60;
export const GATE_BASE_XP = 80;

// Pool par défaut (personnalisable dans Configuration → Réglages).
export const DEFAULT_GATE_POOL: string[] = [
  "10 pompes bonus, tout de suite",
  "15 minutes de lecture supplémentaires",
  "Ranger un tiroir ou une étagère",
  "10 minutes de marche dehors",
  "Boire un grand verre d'eau et 5 min d'étirements",
  "Écrire 3 lignes de journal",
  "Trier 20 photos ou fichiers",
  "Appeler ou écrire à un proche",
];

export type SpawnedGate = { rank: string; title: string; gold: number; xp: number; label: string };

// Tire (ou non) une Porte pour la journée. rnd injectable pour les tests.
export function maybeSpawnGate(pool: string[], rnd: () => number = Math.random): SpawnedGate | null {
  if (rnd() > GATE_SPAWN_CHANCE) return null;
  const clean = pool.filter((p) => p && p.trim());
  if (!clean.length) return null;
  const total = GATE_RANKS.reduce((s, r) => s + r.weight, 0);
  let roll = rnd() * total;
  let def = GATE_RANKS[0];
  for (const r of GATE_RANKS) { roll -= r.weight; if (roll <= 0) { def = r; break; } }
  const title = clean[Math.floor(rnd() * clean.length)].trim();
  return {
    rank: def.rank,
    title,
    gold: Math.round(GATE_BASE_GOLD * def.goldMult),
    xp: Math.round(GATE_BASE_XP * def.xpMult),
    label: def.label,
  };
}

export function gateRankColor(rank: string): string {
  return rank === "S" ? "#ff5d7a" : rank === "A" ? "#ffcf4d" : rank === "B" ? "#b06bff" : rank === "C" ? "#4d9bff" : "#9aa7b3";
}

// --- Failles mensuelles : mini-donjon thématique créé au changement de mois. ---
export type RiftTemplate = { title: string; description: string; steps: string[] };
export const RIFT_TEMPLATES: RiftTemplate[] = [
  { title: "Faille de l'Endurance", description: "Une faille s'est ouverte. Elle se nourrit d'efforts physiques.", steps: ["3 séances de sport cette semaine-là", "Une sortie de plus de 45 minutes", "Un record personnel battu (peu importe lequel)"] },
  { title: "Faille du Savoir", description: "Des murmures s'échappent de la faille : elle veut de la connaissance.", steps: ["Terminer un livre ou 3 articles de fond", "Apprendre et noter 5 choses nouvelles", "Transmettre un savoir à quelqu'un"] },
  { title: "Faille de l'Ordre", description: "Le chaos s'infiltre. Referme la faille en remettant de l'ordre.", steps: ["Trier une pièce ou un espace complet", "Vider ta boîte mail / tes fichiers", "Terminer 3 tâches repoussées depuis trop longtemps"] },
  { title: "Faille des Liens", description: "La faille isole. Romps l'isolement pour la refermer.", steps: ["Un moment de qualité en famille", "Reprendre contact avec quelqu'un", "Rendre un service concret"] },
  { title: "Faille du Bâtisseur", description: "Elle ne se referme que devant une création achevée.", steps: ["Choisir un petit projet créatif ou artisanal", "Y consacrer 3 sessions", "Le terminer et le montrer"] },
];
export function riftForMonth(monthKey: string): RiftTemplate {
  let h = 0;
  for (let i = 0; i < monthKey.length; i++) h = (h * 31 + monthKey.charCodeAt(i)) >>> 0;
  return RIFT_TEMPLATES[h % RIFT_TEMPLATES.length];
}
