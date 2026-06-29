import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, evaluateAchievements, type AchCtx } from "@/lib/achievements";
import { totalPower, rankIndex } from "@/lib/game";
import type { Rank } from "@/lib/game.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst({ include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  const questsDone = await prisma.questLog.count({ where: { hunterId: hunter.id, status: "done" } });
  const dungeonsCleared = await prisma.dungeon.count({ where: { hunterId: hunter.id, status: "cleared" } });
  const levels = hunter.attributes.map((a) => a.level);
  const ctx: AchCtx = {
    rankIndex: rankIndex(hunter.rank as Rank),
    maxAttrLevel: levels.length ? Math.max(...levels) : 0,
    minAttrLevel: levels.length ? Math.min(...levels) : 0,
    totalPower: totalPower(hunter.attributes),
    streak: hunter.streak,
    questsDone,
    dungeonsCleared,
  };

  const evaluated = evaluateAchievements(ctx);
  for (const a of evaluated) {
    if (a.unlocked) {
      await prisma.title.upsert({
        where: { hunterId_key: { hunterId: hunter.id, key: a.key } },
        update: {},
        create: { hunterId: hunter.id, key: a.key, name: a.name, description: a.description, icon: a.icon },
      });
    }
  }

  return NextResponse.json({
    achievements: evaluated.map((a) => ({ key: a.key, name: a.name, description: a.description, icon: a.icon, unlocked: a.unlocked })),
    unlockedCount: evaluated.filter((a) => a.unlocked).length,
    total: ACHIEVEMENTS.length,
  });
}
