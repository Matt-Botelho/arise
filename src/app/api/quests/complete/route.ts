import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyXp, checkPromotion } from "@/lib/game";
import { DIFFICULTY_MULT, type Rank } from "@/lib/game.config";
import { gameDay } from "@/lib/date";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { questId?: string };
  const questId = body.questId;
  if (!questId) return NextResponse.json({ error: "questId manquant" }, { status: 400 });

  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return NextResponse.json({ error: "Quête introuvable" }, { status: 404 });

  const hunter = await prisma.hunter.findUnique({
    where: { id: quest.hunterId },
    include: { attributes: true },
  });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });

  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);

  const already = await prisma.questLog.findUnique({
    where: { questId_date: { questId, date: day } },
  });
  if (already) return NextResponse.json({ error: "Déjà complétée aujourd'hui" }, { status: 409 });

  const mult = DIFFICULTY_MULT[quest.difficulty] ?? 1;
  const gained = Math.round(quest.baseXp * mult);
  const codes: string[] = JSON.parse(quest.attributeCodes || "[]");

  const levelUps: { code: string; name: string; level: number }[] = [];
  const per = codes.length > 0 ? Math.round(gained / codes.length) : 0;

  for (const code of codes) {
    const attr = hunter.attributes.find((a) => a.code === code);
    if (!attr) continue;
    const res = applyXp(attr.level, attr.xp, per);
    await prisma.attribute.update({
      where: { id: attr.id },
      data: { level: res.level, xp: res.xp },
    });
    attr.level = res.level;
    attr.xp = res.xp;
    if (res.leveledUp) levelUps.push({ code: attr.code, name: attr.name, level: res.level });
  }

  await prisma.questLog.create({
    data: { questId, hunterId: hunter.id, date: day, status: "done", xpAwarded: gained },
  });

  await prisma.hunter.update({
    where: { id: hunter.id },
    data: { gold: hunter.gold + Math.round(gained / 5) },
  });

  // Quete de promotion -> on monte le rang.
  let promoted: { from: string; to: string } | null = null;
  if (quest.type === "rankup" && quest.targetRank) {
    promoted = { from: hunter.rank, to: quest.targetRank };
    await prisma.hunter.update({
      where: { id: hunter.id },
      data: { rank: quest.targetRank },
    });
    await prisma.quest.update({ where: { id: quest.id }, data: { active: false } });
    hunter.rank = quest.targetRank;
  }

  const promotion = checkPromotion(
    hunter.rank as Rank,
    hunter.attributes.map((a) => ({ code: a.code, level: a.level }))
  );

  return NextResponse.json({ ok: true, gained, levelUps, promoted, promotion });
}
