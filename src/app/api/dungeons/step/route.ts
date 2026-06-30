import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyAttrXp, rankCeiling, rankIndex } from "@/lib/progression";
import { pickRankLoot } from "@/lib/loot";
import { RANK_TITLES, RANK_INTRO } from "@/lib/ranks-lore";
import { dungeonProgress, type DungeonStep } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { dungeonId?: string; index?: number };
  if (!b.dungeonId || typeof b.index !== "number") return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  const dungeon = await prisma.dungeon.findUnique({ where: { id: b.dungeonId } });
  if (!dungeon) return NextResponse.json({ error: "Donjon introuvable" }, { status: 404 });
  const hunter = await prisma.hunter.findUnique({ where: { id: dungeon.hunterId }, include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });

  if (dungeon.isRankUp && hunter.globalLevel < rankCeiling(hunter.rank)) {
    return NextResponse.json({ error: "Donjon verrouillé : atteins le niveau " + rankCeiling(hunter.rank) + " (max du rang " + hunter.rank + ") pour l'affronter." }, { status: 423 });
  }

  const steps: DungeonStep[] = JSON.parse(dungeon.stepsJson || "[]");
  if (b.index < 0 || b.index >= steps.length) return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  steps[b.index].done = !steps[b.index].done;

  const prog = dungeonProgress(steps);
  const wasCleared = dungeon.status === "cleared";
  const levelUps: { code: string; name: string; level: number }[] = [];
  let newStatus = dungeon.status;
  let rankedUp: { from: string; to: string; title: string; intro: string; gold: number; loot: { name: string; rarity: string } | null } | null = null;

  if (prog.cleared && !wasCleared) {
    newStatus = "cleared";
    const codes: string[] = JSON.parse(dungeon.attributeCodes || "[]");
    const per = codes.length > 0 ? Math.round(dungeon.rewardXp / codes.length) : 0;
    for (const code of codes) {
      const attr = hunter.attributes.find((a) => a.code === code);
      if (!attr) continue;
      const res = applyAttrXp(attr.level, attr.xp, per, hunter.globalLevel);
      await prisma.attribute.update({ where: { id: attr.id }, data: { level: res.level, xp: res.xp } });
      if (res.leveledUp) levelUps.push({ code: attr.code, name: attr.name, level: res.level });
    }

    if (dungeon.isRankUp && dungeon.targetRank) {
      const to = dungeon.targetRank;
      const idx = rankIndex(to);
      const goldBonus = 200 + Math.max(0, idx) * 150;
      const title = RANK_TITLES[to] || hunter.title;
      await prisma.hunter.update({ where: { id: hunter.id }, data: { rank: to, title, gold: hunter.gold + goldBonus, shards: hunter.shards + 5 + Math.max(0, idx) } });
      await prisma.title.upsert({
        where: { hunterId_key: { hunterId: hunter.id, key: "rank_" + to } },
        update: {},
        create: { hunterId: hunter.id, key: "rank_" + to, name: title, description: "Atteint le rang " + to, icon: "👑" },
      }).catch(() => {});
      const owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);
      const it = pickRankLoot(owned);
      let loot: { name: string; rarity: string } | null = null;
      if (it) { await prisma.inventoryItem.upsert({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: it.key } }, update: { qty: { increment: 1 } }, create: { hunterId: hunter.id, itemKey: it.key } }); loot = { name: it.name, rarity: it.rarity }; }
      rankedUp = { from: hunter.rank, to, title, intro: RANK_INTRO[to] || "", gold: goldBonus, loot };
    } else {
      await prisma.hunter.update({ where: { id: hunter.id }, data: { gold: hunter.gold + Math.round(dungeon.rewardXp / 5) } });
    }
  } else if (!prog.cleared && wasCleared) {
    newStatus = "active";
  }

  await prisma.dungeon.update({ where: { id: dungeon.id }, data: { stepsJson: JSON.stringify(steps), status: newStatus } });
  return NextResponse.json({ ok: true, cleared: prog.cleared && !wasCleared, levelUps, rankedUp });
}
