import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyAttrXp, rankCeiling } from "@/lib/progression";
import { dungeonProgress, type DungeonStep } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { dungeonId?: string; index?: number };
  if (!b.dungeonId || typeof b.index !== "number") {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  const dungeon = await prisma.dungeon.findUnique({ where: { id: b.dungeonId } });
  if (!dungeon) return NextResponse.json({ error: "Donjon introuvable" }, { status: 404 });
  const hunter = await prisma.hunter.findUnique({ where: { id: dungeon.hunterId }, include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });

  // Verrou : un donjon de passage de rang ne se valide qu'au niveau max du rang
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
  let rankedUp: { from: string; to: string } | null = null;

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
    const goldBonus = Math.round(dungeon.rewardXp / 5);
    if (dungeon.isRankUp && dungeon.targetRank) {
      rankedUp = { from: hunter.rank, to: dungeon.targetRank };
      await prisma.hunter.update({ where: { id: hunter.id }, data: { rank: dungeon.targetRank, gold: hunter.gold + goldBonus } });
    } else {
      await prisma.hunter.update({ where: { id: hunter.id }, data: { gold: hunter.gold + goldBonus } });
    }
  } else if (!prog.cleared && wasCleared) {
    newStatus = "active";
  }

  await prisma.dungeon.update({ where: { id: dungeon.id }, data: { stepsJson: JSON.stringify(steps), status: newStatus } });
  return NextResponse.json({ ok: true, cleared: prog.cleared && !wasCleared, levelUps, rankedUp });
}
