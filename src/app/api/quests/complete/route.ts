import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExhausted } from "@/lib/game";
import { DIFFICULTY_MULT } from "@/lib/game.config";
import { gameDay } from "@/lib/date";
import { rollLoot } from "@/lib/loot";
import { applyGlobalXp, applyAttrXp, rankCeiling, rankUpAvailable } from "@/lib/progression";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { questId?: string };
  const questId = body.questId;
  if (!questId) return NextResponse.json({ error: "questId manquant" }, { status: 400 });
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return NextResponse.json({ error: "Quête introuvable" }, { status: 404 });
  const hunter = await prisma.hunter.findUnique({ where: { id: quest.hunterId }, include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });

  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const already = await prisma.questLog.findUnique({ where: { questId_date: { questId, date: day } } });
  if (already) return NextResponse.json({ error: "Déjà complétée aujourd'hui" }, { status: 409 });

  const mult = DIFFICULTY_MULT[quest.difficulty] ?? 1;
  const exhausted = isExhausted(hunter.hp);
  const gained = Math.round(quest.baseXp * mult * (exhausted ? 0.5 : 1));

  // XP global (plafonné au sommet du rang)
  const ceiling = rankCeiling(hunter.rank);
  const g = applyGlobalXp(hunter.globalLevel, hunter.globalXp, gained, ceiling);

  // XP d'attribut (plafonné par le niveau global)
  const codes: string[] = JSON.parse(quest.attributeCodes || "[]");
  const per = codes.length > 0 ? Math.round(gained / codes.length) : 0;
  const levelUps: { code: string; name: string; level: number }[] = [];
  for (const code of codes) {
    const attr = hunter.attributes.find((a) => a.code === code);
    if (!attr) continue;
    const res = applyAttrXp(attr.level, attr.xp, per, g.level);
    if (res.level !== attr.level || res.xp !== attr.xp) {
      await prisma.attribute.update({ where: { id: attr.id }, data: { level: res.level, xp: res.xp } });
    }
    attr.level = res.level; attr.xp = res.xp;
    if (res.leveledUp) levelUps.push({ code: attr.code, name: attr.name, level: res.level });
  }

  await prisma.questLog.create({ data: { questId, hunterId: hunter.id, date: day, status: "done", xpAwarded: gained } });

  const newHp = Math.min(hunter.maxHp, hunter.hp + 2);
  await prisma.hunter.update({
    where: { id: hunter.id },
    data: { gold: hunter.gold + Math.round(gained / 5), hp: newHp, globalLevel: g.level, globalXp: g.xp },
  });

  // Loot : chance de drop d'une pièce non-commune non possédée
  let drop: { key: string; name: string; rarity: string } | null = null;
  const owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);
  const it = rollLoot(owned, quest.difficulty);
  if (it) {
    await prisma.inventoryItem.upsert({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: it.key } }, update: { qty: { increment: 1 } }, create: { hunterId: hunter.id, itemKey: it.key } });
    drop = { key: it.key, name: it.name, rarity: it.rarity };
  }

  return NextResponse.json({
    ok: true, gained, exhausted,
    globalLevel: g.level, globalLeveledUp: g.leveledUp, atCeiling: g.atCeiling,
    rankUpReady: rankUpAvailable(g.level, hunter.rank),
    levelUps, drop,
  });
}
