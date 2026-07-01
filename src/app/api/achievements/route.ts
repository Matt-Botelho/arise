import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, evaluateAchievements, type AchCtx } from "@/lib/achievements";
import { totalPower } from "@/lib/game";
import { rankIndex } from "@/lib/progression";
import { ITEM_BY_KEY } from "@/lib/lpc-items";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst({ include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  const questsDone = await prisma.questLog.count({ where: { hunterId: hunter.id, status: "done" } });
  const dungeonsCleared = await prisma.dungeon.count({ where: { hunterId: hunter.id, status: "cleared" } });
  const levels = hunter.attributes.map((a) => a.level);
  const ctx: AchCtx = {
    rankIndex: rankIndex(hunter.rank),
    globalLevel: hunter.globalLevel,
    maxAttrLevel: levels.length ? Math.max(...levels) : 0,
    minAttrLevel: levels.length ? Math.min(...levels) : 0,
    totalPower: totalPower(hunter.attributes),
    streak: hunter.streak,
    questsDone,
    dungeonsCleared,
  };

  const evaluated = evaluateAchievements(ctx);
  const existing = await prisma.title.findMany({ where: { hunterId: hunter.id } });
  const have = new Set(existing.map((t) => t.key));

  let goldGain = 0;
  let shardGain = 0;
  const newlyUnlocked: { key: string; name: string; icon: string; tier: string; reward: { gold: number; shards: number; skin?: string } }[] = [];
  for (const a of evaluated) {
    if (!a.unlocked || have.has(a.key)) continue;
    goldGain += a.reward.gold;
    shardGain += a.reward.shards;
    if (a.reward.skin && ITEM_BY_KEY[a.reward.skin]) {
      await prisma.inventoryItem.upsert({
        where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: a.reward.skin } },
        update: {},
        create: { hunterId: hunter.id, itemKey: a.reward.skin },
      });
    }
    await prisma.title.create({ data: { hunterId: hunter.id, key: a.key, name: a.name, description: a.description, icon: a.icon } });
    newlyUnlocked.push({ key: a.key, name: a.name, icon: a.icon, tier: a.tier, reward: a.reward });
  }
  if (goldGain || shardGain) {
    await prisma.hunter.update({ where: { id: hunter.id }, data: { gold: hunter.gold + goldGain, shards: hunter.shards + shardGain } });
  }

  return NextResponse.json({
    achievements: evaluated.map((a) => ({ key: a.key, name: a.name, description: a.description, icon: a.icon, tier: a.tier, reward: a.reward, unlocked: a.unlocked })),
    unlockedCount: evaluated.filter((a) => a.unlocked).length,
    total: ACHIEVEMENTS.length,
    newlyUnlocked,
    activeTitle: hunter.title,
    titles: evaluated.filter((a) => a.unlocked).map((a) => ({ key: a.key, name: a.name, icon: a.icon })),
  });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { titleName?: string };
  if (!b.titleName || !b.titleName.trim()) return NextResponse.json({ error: "titleName requis" }, { status: 400 });
  const t = await prisma.title.findFirst({ where: { hunterId: hunter.id, name: b.titleName.trim() } });
  if (!t) return NextResponse.json({ error: "Titre non débloqué" }, { status: 400 });
  await prisma.hunter.update({ where: { id: hunter.id }, data: { title: t.name } });
  return NextResponse.json({ ok: true, title: t.name });
}
