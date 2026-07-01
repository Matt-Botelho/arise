import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const objectives = await prisma.objective.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "asc" } });
  const activeQuests = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, objectiveId: { not: null } } });
  const linkedQuests = await prisma.quest.findMany({ where: { hunterId: hunter.id, objectiveId: { not: null } }, select: { id: true, objectiveId: true } });
  const qToObj: Record<string, string> = Object.fromEntries(linkedQuests.map((q) => [q.id, q.objectiveId as string]));
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, status: "done", questId: { in: linkedQuests.map((q) => q.id) } }, select: { questId: true } });
  const progressByObj: Record<string, number> = {};
  for (const l of logs) { const oid = qToObj[l.questId]; if (oid) progressByObj[oid] = (progressByObj[oid] || 0) + 1; }
  return NextResponse.json({
    objectives: objectives.map((o) => ({
      ...o,
      progress: progressByObj[o.id] || 0,
      quests: activeQuests.filter((q) => q.objectiveId === o.id).map((q) => ({ id: q.id, title: q.title, baseXp: q.baseXp, difficulty: q.difficulty })),
    })),
  });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { attributeCode?: string; horizon?: string; title?: string; description?: string; targetCount?: number; kind?: string; metricUnit?: string; startValue?: number; targetValue?: number };
  if (!b.attributeCode || !b.title || !b.title.trim()) return NextResponse.json({ error: "Domaine et titre requis" }, { status: 400 });
  const horizon = b.horizon === "moyen" ? "moyen" : "court";
  const targetCount = Number.isInteger(b.targetCount) && (b.targetCount as number) > 0 ? (b.targetCount as number) : 10;
  const kind = b.kind === "metric" ? "metric" : "count";
  const data: {
    hunterId: string; attributeCode: string; horizon: string; title: string; description: string; targetCount: number; kind: string;
    metricUnit?: string | null; startValue?: number | null; targetValue?: number | null; currentValue?: number | null;
  } = { hunterId: hunter.id, attributeCode: b.attributeCode, horizon, title: b.title.trim(), description: typeof b.description === "string" ? b.description : "", targetCount, kind };
  if (kind === "metric") {
    data.metricUnit = typeof b.metricUnit === "string" ? b.metricUnit.slice(0, 12) : "";
    data.startValue = typeof b.startValue === "number" ? b.startValue : 0;
    data.targetValue = typeof b.targetValue === "number" ? b.targetValue : 0;
    data.currentValue = data.startValue;
  }
  const objective = await prisma.objective.create({ data });
  return NextResponse.json({ ok: true, objective });
}

export async function PATCH(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: string; targetCount?: number; currentValue?: number };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const data: { status?: string; targetCount?: number; currentValue?: number } = {};
  if (typeof b.status === "string") data.status = b.status === "done" ? "done" : "active";
  if (Number.isInteger(b.targetCount) && (b.targetCount as number) > 0) data.targetCount = b.targetCount as number;
  if (typeof b.currentValue === "number") data.currentValue = b.currentValue;
  if (Object.keys(data).length) await prisma.objective.update({ where: { id: b.id }, data }).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.quest.updateMany({ where: { objectiveId: b.id }, data: { objectiveId: null } }).catch(() => {});
  await prisma.objective.delete({ where: { id: b.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
