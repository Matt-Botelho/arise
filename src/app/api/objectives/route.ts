import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const objectives = await prisma.objective.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "asc" } });
  const quests = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, objectiveId: { not: null } } });
  return NextResponse.json({
    objectives: objectives.map((o) => ({
      ...o,
      quests: quests.filter((q) => q.objectiveId === o.id).map((q) => ({ id: q.id, title: q.title, baseXp: q.baseXp, difficulty: q.difficulty })),
    })),
  });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { attributeCode?: string; horizon?: string; title?: string; description?: string };
  if (!b.attributeCode || !b.title || !b.title.trim()) return NextResponse.json({ error: "Domaine et titre requis" }, { status: 400 });
  const horizon = b.horizon === "moyen" ? "moyen" : "court";
  const objective = await prisma.objective.create({
    data: { hunterId: hunter.id, attributeCode: b.attributeCode, horizon, title: b.title.trim(), description: typeof b.description === "string" ? b.description : "" },
  });
  return NextResponse.json({ ok: true, objective });
}

export async function PATCH(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.objective.update({ where: { id: b.id }, data: { status: b.status === "done" ? "done" : "active" } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.quest.updateMany({ where: { objectiveId: b.id }, data: { objectiveId: null } }).catch(() => {});
  await prisma.objective.delete({ where: { id: b.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
