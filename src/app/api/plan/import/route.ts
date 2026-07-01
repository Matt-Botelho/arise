// Import d'un plan d'aventure complet (généré par une IA ou écrit à la main).
// Crée en une passe : arbre d'objectifs (long → moyen → court, liés par `ref`/`parentRef`),
// quêtes journalières/auto rattachées, missions hebdo, donjons et récompenses réelles.
// Purement ADDITIF : ne supprime ni ne modifie rien d'existant.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ATTRIBUTES } from "@/lib/game.config";
import { canonicalMetric } from "@/lib/health";

export const dynamic = "force-dynamic";

type PlanQuest = { title?: string; difficulty?: string; baseXp?: number; isMandatory?: boolean; attributeCodes?: string[]; metricKey?: string; threshold?: number };
type PlanObjective = {
  ref?: string; parentRef?: string | null;
  title?: string; description?: string; attributeCode?: string; horizon?: string;
  kind?: string; targetCount?: number; baseXp?: number;
  recurrence?: string; steps?: string[];
  metricUnit?: string; startValue?: number; targetValue?: number; metricKey?: string;
  quests?: PlanQuest[];
};
type PlanWeekly = { title?: string; steps?: string[]; attributeCodes?: string[]; baseXp?: number };
type PlanDungeon = { title?: string; description?: string; rank?: string; steps?: string[]; attributeCodes?: string[]; rewardXp?: number; isRankUp?: boolean };
type PlanReward = { title?: string; cost?: number; icon?: string };
type Plan = { objectives?: PlanObjective[]; weeklies?: PlanWeekly[]; dungeons?: PlanDungeon[]; rewards?: PlanReward[] };

const VALID_CODES = new Set(ATTRIBUTES.map((a) => a.code));
const VALID_DIFF = new Set(["E", "D", "C", "B", "A", "S"]);

function cleanCodes(codes: unknown): string[] {
  return (Array.isArray(codes) ? codes : []).filter((c): c is string => typeof c === "string" && VALID_CODES.has(c));
}
function cleanSteps(steps: unknown): { label: string; done: boolean }[] {
  return (Array.isArray(steps) ? steps : []).filter((s): s is string => typeof s === "string" && !!s.trim()).map((label) => ({ label: label.trim(), done: false }));
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { plan?: Plan } | Plan | null;
  const plan: Plan | null = body ? (("plan" in (body as Record<string, unknown>) ? (body as { plan?: Plan }).plan : (body as Plan)) ?? null) : null;
  if (!plan || typeof plan !== "object") return NextResponse.json({ error: "JSON invalide : attendu { plan: { objectives, weeklies, dungeons, rewards } }" }, { status: 400 });

  const report = { objectives: 0, quests: 0, weeklies: 0, dungeons: 0, rewards: 0, warnings: [] as string[] };
  const idByRef: Record<string, string> = {};

  // 1. Objectifs — parents d'abord (tri : les parentRef doivent référencer un objectif déjà créé ou existant plus haut dans la liste).
  const objectives = Array.isArray(plan.objectives) ? plan.objectives : [];
  for (const [i, o] of objectives.entries()) {
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const code = typeof o.attributeCode === "string" && VALID_CODES.has(o.attributeCode) ? o.attributeCode : null;
    if (!title || !code) { report.warnings.push("Objectif #" + (i + 1) + " ignoré (titre ou attributeCode invalide)"); continue; }
    const horizon = ["long", "moyen", "court"].includes(o.horizon || "") ? (o.horizon as string) : "court";
    const kind = ["metric", "checklist"].includes(o.kind || "") ? (o.kind as string) : "count";
    let parentId: string | null = null;
    if (o.parentRef) {
      parentId = idByRef[o.parentRef] ?? null;
      if (!parentId) report.warnings.push("Objectif « " + title + " » : parentRef introuvable (" + o.parentRef + "), créé à la racine");
    }
    const data: Record<string, unknown> = {
      hunterId: hunter.id, title, attributeCode: code, horizon, kind, parentId,
      description: typeof o.description === "string" ? o.description : "",
      baseXp: Number.isInteger(o.baseXp) && (o.baseXp as number) > 0 ? o.baseXp : 50,
      targetCount: Number.isInteger(o.targetCount) && (o.targetCount as number) > 0 ? o.targetCount : 10,
    };
    if (kind === "checklist") {
      data.recurrence = ["week", "month"].includes(o.recurrence || "") ? o.recurrence : "once";
      data.stepsJson = JSON.stringify(cleanSteps(o.steps));
    } else if (kind === "metric") {
      data.metricUnit = typeof o.metricUnit === "string" ? o.metricUnit.slice(0, 12) : "";
      data.startValue = typeof o.startValue === "number" ? o.startValue : 0;
      data.targetValue = typeof o.targetValue === "number" ? o.targetValue : 0;
      data.currentValue = data.startValue;
      if (typeof o.metricKey === "string" && canonicalMetric(o.metricKey)) data.metricKey = canonicalMetric(o.metricKey);
    }
    const created = await prisma.objective.create({ data: data as never });
    report.objectives++;
    if (o.ref) idByRef[o.ref] = created.id;

    // 1b. Quêtes rattachées à cet objectif.
    for (const q of Array.isArray(o.quests) ? o.quests : []) {
      const qt = typeof q.title === "string" ? q.title.trim() : "";
      if (!qt) { report.warnings.push("Quête sans titre ignorée (objectif « " + title + " »)"); continue; }
      const mk = typeof q.metricKey === "string" ? canonicalMetric(q.metricKey) : null;
      const isAuto = !!mk && typeof q.threshold === "number" && q.threshold > 0;
      await prisma.quest.create({
        data: {
          hunterId: hunter.id, title: qt, type: isAuto ? "auto" : "daily", recurrence: "daily",
          attributeCodes: JSON.stringify(cleanCodes(q.attributeCodes).length ? cleanCodes(q.attributeCodes) : [code]),
          baseXp: Number.isInteger(q.baseXp) && (q.baseXp as number) > 0 ? (q.baseXp as number) : 50,
          difficulty: VALID_DIFF.has(q.difficulty || "") ? (q.difficulty as string) : "E",
          isMandatory: !!q.isMandatory,
          objectiveId: created.id,
          metricKey: isAuto ? mk : null,
          threshold: isAuto ? (q.threshold as number) : null,
        },
      });
      report.quests++;
    }
  }

  // 2. Missions hebdomadaires.
  for (const w of Array.isArray(plan.weeklies) ? plan.weeklies : []) {
    const title = typeof w.title === "string" ? w.title.trim() : "";
    const steps = cleanSteps(w.steps);
    if (!title || !steps.length) { report.warnings.push("Hebdo ignorée (titre/étapes manquants)"); continue; }
    await prisma.weekly.create({
      data: { hunterId: hunter.id, title, stepsJson: JSON.stringify(steps), attributeCodes: JSON.stringify(cleanCodes(w.attributeCodes)), baseXp: Number.isInteger(w.baseXp) && (w.baseXp as number) > 0 ? (w.baseXp as number) : 400 },
    });
    report.weeklies++;
  }

  // 3. Donjons (jalons-preuve).
  for (const d of Array.isArray(plan.dungeons) ? plan.dungeons : []) {
    const title = typeof d.title === "string" ? d.title.trim() : "";
    const steps = cleanSteps(d.steps);
    if (!title || !steps.length) { report.warnings.push("Donjon ignoré (titre/étapes manquants)"); continue; }
    await prisma.dungeon.create({
      data: {
        hunterId: hunter.id, title, description: typeof d.description === "string" ? d.description : "",
        rank: VALID_DIFF.has(d.rank || "") ? (d.rank as string) : "D",
        stepsJson: JSON.stringify(steps), attributeCodes: JSON.stringify(cleanCodes(d.attributeCodes)),
        rewardXp: Number.isInteger(d.rewardXp) && (d.rewardXp as number) > 0 ? (d.rewardXp as number) : 400,
        isRankUp: !!d.isRankUp,
      },
    });
    report.dungeons++;
  }

  // 4. Récompenses réelles.
  for (const r of Array.isArray(plan.rewards) ? plan.rewards : []) {
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue;
    await prisma.reward.create({
      data: { hunterId: hunter.id, title, cost: Number.isInteger(r.cost) && (r.cost as number) > 0 ? (r.cost as number) : 100, icon: typeof r.icon === "string" && r.icon ? r.icon : "🎁" },
    });
    report.rewards++;
  }

  return NextResponse.json({ ok: true, ...report });
}
