import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { previousDay } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst({ include: { attributes: { orderBy: { order: "asc" } } } });
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  let day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const days: string[] = [];
  for (let i = 0; i < 30; i++) { days.unshift(day); day = previousDay(day); }

  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: { in: days } } });
  const byDay: Record<string, { xp: number; done: number; failed: number }> = {};
  for (const d of days) byDay[d] = { xp: 0, done: 0, failed: 0 };
  for (const l of logs) {
    const e = byDay[l.date]; if (!e) continue;
    if (l.status === "done") { e.done++; e.xp += l.xpAwarded; }
    else if (l.status === "failed") e.failed++;
  }

  return NextResponse.json({
    series: days.map((d) => ({ day: d, ...byDay[d] })),
    attributes: hunter.attributes.map((a) => ({ code: a.code, name: a.name, color: a.color, level: a.level })),
  });
}
