import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  return NextResponse.json({ onboarded: hunter.onboarded, name: hunter.name });
}

type ObjIn = { attributeCode: string; horizon: string; title: string; quests?: { title: string; baseXp?: number; difficulty?: string }[] };

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; objectives?: ObjIn[] };

  if (typeof b.name === "string" && b.name.trim()) {
    await prisma.hunter.update({ where: { id: hunter.id }, data: { name: b.name.trim() } });
  }

  let createdObj = 0, createdQuests = 0;
  for (const o of (Array.isArray(b.objectives) ? b.objectives : [])) {
    if (!o.attributeCode || !o.title || !o.title.trim()) continue;
    const horizon = o.horizon === "moyen" ? "moyen" : "court";
    const obj = await prisma.objective.create({
      data: { hunterId: hunter.id, attributeCode: o.attributeCode, horizon, title: o.title.trim() },
    });
    createdObj++;
    for (const q of (Array.isArray(o.quests) ? o.quests : [])) {
      if (!q.title || !q.title.trim()) continue;
      await prisma.quest.create({
        data: {
          hunterId: hunter.id, title: q.title.trim(), type: "daily", recurrence: "daily",
          attributeCodes: JSON.stringify([o.attributeCode]),
          baseXp: Number.isInteger(q.baseXp) && (q.baseXp as number) > 0 ? (q.baseXp as number) : 50,
          difficulty: ["E", "D", "C", "B", "A", "S"].includes(q.difficulty || "") ? (q.difficulty as string) : "E",
          objectiveId: obj.id,
        },
      });
      createdQuests++;
    }
  }

  await prisma.hunter.update({ where: { id: hunter.id }, data: { onboarded: true } });
  return NextResponse.json({ ok: true, createdObjectives: createdObj, createdQuests });
}
