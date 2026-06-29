import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);

  const quests = await prisma.quest.findMany({
    where: { hunterId: hunter.id, active: true },
    orderBy: { createdAt: "asc" },
  });
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: day } });
  const doneIds = new Set(logs.map((l) => l.questId));

  return NextResponse.json({
    day,
    quests: quests.map((q) => ({
      ...q,
      attributeCodes: JSON.parse(q.attributeCodes || "[]"),
      done: doneIds.has(q.id),
    })),
  });
}
