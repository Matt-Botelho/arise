import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totalPower, isExhausted, xpForLevel } from "@/lib/game";
import { rankCeiling, nextRank, rankUpAvailable, globalXpForLevel, RANKS } from "@/lib/progression";

export const dynamic = "force-dynamic";

const STEPS_BY_RANK = [3, 3, 4, 4, 5, 6, 7, 8, 9, 10];

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

  // Génère le Donjon de Changement de Rang si débloqué et absent
  if (canRankUp && target) {
    const existing = await prisma.dungeon.findFirst({ where: { hunterId: hunter.id, isRankUp: true, targetRank: target, status: "active" } });
    if (!existing) {
      const idx = (RANKS as readonly string[]).indexOf(hunter.rank);
      const nSteps = STEPS_BY_RANK[idx] ?? 4;
      const steps = Array.from({ length: nSteps }, (_, i) => ({ label: "Épreuve " + (i + 1) + " — passage " + hunter.rank + " → " + target, done: false }));
      await prisma.dungeon.create({
        data: {
          hunterId: hunter.id, isRankUp: true, targetRank: target,
          title: "Donjon de Rang : " + hunter.rank + " → " + target,
          description: "Le Système t'a jugé prêt. Accomplis ces épreuves pour franchir le palier et t'élever au rang " + target + ".",
          rank: hunter.rank, stepsJson: JSON.stringify(steps), attributeCodes: "[]",
          rewardXp: 300 + idx * 100, status: "active",
        },
      });
    }
  }

  const penalties = await prisma.penalty.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "desc" }, take: 5 });

  return NextResponse.json({
    hunter: {
      name: hunter.name, rank: hunter.rank,
      globalLevel: hunter.globalLevel, globalXp: hunter.globalXp, globalXpNext: globalXpForLevel(hunter.globalLevel),
      ceiling, nextRank: target, rankUpAvailable: canRankUp,
      hp: hunter.hp, maxHp: hunter.maxHp, mp: hunter.mp, maxMp: hunter.maxMp,
      gold: hunter.gold, title: hunter.title, streak: hunter.streak, exhausted: isExhausted(hunter.hp),
    },
    attributes: hunter.attributes.map((a) => ({ ...a, xpNext: xpForLevel(a.level), capped: a.level >= hunter.globalLevel })),
    power: totalPower(hunter.attributes),
    penalties,
  });
}
