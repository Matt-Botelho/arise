import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { themeForDay, DEFAULT_DAY_THEME } from "@/lib/progression";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const quests = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true }, orderBy: { createdAt: "asc" } });
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: day } });
  const doneIds = new Set(logs.map((l) => l.questId));
  const weekday = new Date(day + "T12:00:00").getDay();
  const themeMap = hunter.dayThemeJson ? JSON.parse(hunter.dayThemeJson) : DEFAULT_DAY_THEME;
  const dayThemeCode = themeForDay(weekday, themeMap);
  return NextResponse.json({
    day,
    dayThemeCode,
    sfxEnabled: hunter.sfxEnabled,
    quests: quests.map((q) => ({ ...q, attributeCodes: JSON.parse(q.attributeCodes || "[]"), done: doneIds.has(q.id) })),
  });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { title?: string; attributeCodes?: string[]; baseXp?: number; difficulty?: string; isMandatory?: boolean; objectiveId?: string | null };
  if (!b.title || !b.title.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const quest = await prisma.quest.create({
    data: {
      hunterId: hunter.id, title: b.title.trim(), type: "daily", recurrence: "daily",
      attributeCodes: JSON.stringify(Array.isArray(b.attributeCodes) ? b.attributeCodes : []),
      baseXp: Number.isInteger(b.baseXp) && (b.baseXp as number) > 0 ? (b.baseXp as number) : 50,
      difficulty: ["E", "D", "C", "B", "A", "S"].includes(b.difficulty || "") ? (b.difficulty as string) : "E",
      isMandatory: !!b.isMandatory,
      objectiveId: b.objectiveId || null,
    },
  });
  return NextResponse.json({ ok: true, quest });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.quest.update({ where: { id: b.id }, data: { active: false } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
