import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totalPower, isExhausted, xpForLevel } from "@/lib/game";
import { rankCeiling, nextRank, rankUpAvailable, globalXpForLevel } from "@/lib/progression";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst({ include: { attributes: { orderBy: { order: "asc" } } } });
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur. Lance `npm run seed`." }, { status: 404 });

  // Migration douce vers le niveau global : aligne sur l'attribut le plus haut (une seule fois)
  if (hunter.globalLevel <= 1 && hunter.globalXp === 0) {
    const maxAttr = hunter.attributes.reduce((m, a) => Math.max(m, a.level), 1);
    if (maxAttr > 1) {
      const initial = Math.min(rankCeiling(hunter.rank), maxAttr);
      await prisma.hunter.update({ where: { id: hunter.id }, data: { globalLevel: initial } });
      hunter.globalLevel = initial;
    }
  }

  // Ancienne quête "rankup" -> désactivée (le passage de rang se fait par donjon)
  await prisma.quest.updateMany({ where: { hunterId: hunter.id, type: "rankup", active: true }, data: { active: false } }).catch(() => {});

  const ceiling = rankCeiling(hunter.rank);
  const target = nextRank(hunter.rank);
  const canRankUp = rankUpAvailable(hunter.globalLevel, hunter.rank);

  const penalties = await prisma.penalty.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "desc" }, take: 5 });

  return NextResponse.json({
    hunter: {
      name: hunter.name, rank: hunter.rank,
      globalLevel: hunter.globalLevel, globalXp: hunter.globalXp, globalXpNext: globalXpForLevel(hunter.globalLevel),
      ceiling, nextRank: target, rankUpAvailable: canRankUp,
      hp: hunter.hp, maxHp: hunter.maxHp, mp: hunter.mp, maxMp: hunter.maxMp,
      gold: hunter.gold, title: hunter.title, streak: hunter.streak, exhausted: isExhausted(hunter.hp), onboarded: hunter.onboarded,
    },
    attributes: hunter.attributes.map((a) => ({ ...a, xpNext: xpForLevel(a.level), capped: a.level >= hunter.globalLevel })),
    power: totalPower(hunter.attributes),
    penalties,
  });
}
