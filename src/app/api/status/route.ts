import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPromotion, totalPower, promotionProgress, isExhausted } from "@/lib/game";
import type { Rank } from "@/lib/game.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst({
    include: { attributes: { orderBy: { order: "asc" } } },
  });
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur. Lance `npm run seed`." }, { status: 404 });

  const attrs = hunter.attributes.map((a) => ({ code: a.code, level: a.level }));
  const promo = checkPromotion(hunter.rank as Rank, attrs);

  if (promo.eligible && promo.nextRank) {
    const existing = await prisma.quest.findFirst({
      where: { hunterId: hunter.id, type: "rankup", targetRank: promo.nextRank, active: true },
    });
    if (!existing) {
      await prisma.quest.create({
        data: {
          hunterId: hunter.id,
          title: "Épreuve de promotion : Rang " + hunter.rank + " → " + promo.nextRank,
          description: "Le Système t'a jugé prêt. Accomplis l'épreuve pour t'élever.",
          type: "rankup", recurrence: "once", attributeCodes: "[]",
          baseXp: 200, difficulty: "A", isMandatory: false, targetRank: promo.nextRank,
        },
      });
    }
  }

  const penalties = await prisma.penalty.findMany({
    where: { hunterId: hunter.id }, orderBy: { createdAt: "desc" }, take: 5,
  });

  return NextResponse.json({
    hunter: {
      name: hunter.name, rank: hunter.rank, hp: hunter.hp, maxHp: hunter.maxHp,
      mp: hunter.mp, maxMp: hunter.maxMp, gold: hunter.gold, title: hunter.title,
      streak: hunter.streak, exhausted: isExhausted(hunter.hp),
    },
    attributes: hunter.attributes,
    power: totalPower(hunter.attributes),
    promotion: { ...promo, progress: promotionProgress(hunter.rank as Rank, hunter.attributes) },
    penalties,
  });
}
