import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay, periodKeyFor } from "@/lib/date";

export const dynamic = "force-dynamic";

type St = { label: string; done: boolean };

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const all = await prisma.objective.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "asc" } });
  const activeQuests = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, objectiveId: { not: null } } });
  const linkedQuests = await prisma.quest.findMany({ where: { hunterId: hunter.id, objectiveId: { not: null } }, select: { id: true, objectiveId: true } });
  const qToObj: Record<string, string> = Object.fromEntries(linkedQuests.map((q) => [q.id, q.objectiveId as string]));
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, status: "done", questId: { in: linkedQuests.map((q) => q.id) } }, select: { questId: true } });
  const countByObj: Record<string, number> = {};
  for (const l of logs) { const oid = qToObj[l.questId]; if (oid) countByObj[oid] = (countByObj[oid] || 0) + 1; }
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);

  const objectives = all.map((o) => {
    let steps: St[] | null = null;
    let frac = 0;
    let done = false;
    if (o.kind === "checklist") {
      let st: St[] = JSON.parse(o.stepsJson || "[]");
      const pkey = periodKeyFor(o.recurrence, day);
      if (o.recurrence !== "once" && o.periodKey !== pkey) st = st.map((s) => ({ ...s, done: false }));
      steps = st;
      const total = st.length; const d = st.filter((s) => s.done).length;
      frac = total ? d / total : 0;
      done = o.recurrence === "once" ? (o.status === "done" || (total > 0 && d === total)) : false;
    } else if (o.kind === "metric") {
      const start = o.startValue ?? 0; const target = o.targetValue ?? 0; const cv = o.currentValue ?? start;
      frac = target === start ? (cv >= target ? 1 : 0) : Math.max(0, Math.min(1, (cv - start) / (target - start)));
      done = o.status === "done" || frac >= 1;
    } else {
      const p = countByObj[o.id] || 0;
      frac = Math.min(1, p / (o.targetCount || 10));
      done = o.status === "done" || p >= (o.targetCount || 10);
    }
    return {
      ...o, steps, progress: countByObj[o.id] || 0, frac, done,
      quests: activeQuests.filter((q) => q.objectiveId === o.id).map((q) => ({ id: q.id, title: q.title, baseXp: q.baseXp, difficulty: q.difficulty })),
    };
  });
  return NextResponse.json({ objectives });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as {
    attributeCode?: string; horizon?: string; title?: string; description?: string; targetCount?: number;
    kind?: string; metricUnit?: string; startValue?: number; targetValue?: number;
    parentId?: string | null; baseXp?: number; recurrence?: string; steps?: string[];
  };
  if (!b.attributeCode || !b.title || !b.title.trim()) return NextResponse.json({ error: "Domaine et titre requis" }, { status: 400 });
  const horizon = ["long", "moyen", "court"].includes(b.horizon || "") ? (b.horizon as string) : "court";
  const kind = ["metric", "checklist"].includes(b.kind || "") ? (b.kind as string) : "count";
  const baseXp = Number.isInteger(b.baseXp) && (b.baseXp as number) > 0 ? (b.baseXp as number) : 50;

  const data: Record<string, unknown> = {
    hunterId: hunter.id, attributeCode: b.attributeCode, horizon, title: b.title.trim(),
    description: typeof b.description === "string" ? b.description : "", kind, baseXp,
    parentId: b.parentId || null,
    targetCount: Number.isInteger(b.targetCount) && (b.targetCount as number) > 0 ? (b.targetCount as number) : 10,
  };
  if (kind === "checklist") {
    data.recurrence = ["week", "month"].includes(b.recurrence || "") ? b.recurrence : "once";
    data.stepsJson = JSON.stringify((Array.isArray(b.steps) ? b.steps : []).filter((x) => typeof x === "string" && x.trim()).map((label) => ({ label: label.trim(), done: false })));
  } else if (kind === "metric") {
    data.metricUnit = typeof b.metricUnit === "string" ? b.metricUnit.slice(0, 12) : "";
    data.startValue = typeof b.startValue === "number" ? b.startValue : 0;
    data.targetValue = typeof b.targetValue === "number" ? b.targetValue : 0;
    data.currentValue = data.startValue;
  }
  const objective = await prisma.objective.create({ data: data as never });
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
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const all = await prisma.objective.findMany({ where: { hunterId: hunter.id }, select: { id: true, parentId: true } });
  const childrenOf: Record<string, string[]> = {};
  for (const o of all) if (o.parentId) (childrenOf[o.parentId] ||= []).push(o.id);
  const toDelete: string[] = [];
  const stack = [b.id];
  while (stack.length) { const id = stack.pop() as string; toDelete.push(id); for (const c of childrenOf[id] || []) stack.push(c); }
  await prisma.quest.updateMany({ where: { objectiveId: { in: toDelete } }, data: { objectiveId: null } }).catch(() => {});
  await prisma.objective.deleteMany({ where: { id: { in: toDelete } } }).catch(() => {});
  return NextResponse.json({ ok: true, deleted: toDelete.length });
}
