import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyGlobalXp, applyAttrXp, rankCeiling } from "@/lib/progression";
import { rollLoot } from "@/lib/loot";
import { dungeonProgress, type DungeonStep } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { weeklyId?: string; index?: number };
  if (!b.weeklyId || typeof b.index !== "number") return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  const weekly = await prisma.weekly.findUnique({ where: { id: b.weeklyId } });
  if (!weekly) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  if (weekly.status === "done") return NextResponse.json({ ok: true, alreadyDone: true });
  const hunter = await prisma.hunter.findUnique({ where: { id: weekly.hunterId }, include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });

  const steps: DungeonStep[] = JSON.parse(weekly.stepsJson || "[]");
  if (b.index < 0 || b.index >= steps.length) return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  steps[b.index].done = !steps[b.index].done;
  const prog = dungeonProgress(steps);

  let rewarded = false; let gained = 0; let drop: { key: string; name: string; rarity: string } | null = null;
  const levelUps: { code: string; name: string; level: number }[] = [];
  let newStatus = weekly.status;

  if (prog.cleared) {
    newStatus = "done"; rewarded = true; gained = weekly.baseXp;
    const ceiling = rankCeiling(hunter.rank);
    const g = applyGlobalXp(hunter.globalLevel, hunter.globalXp, gained, ceiling);
    const codes: string[] = JSON.parse(weekly.attributeCodes || "[]");
    const per = codes.length > 0 ? Math.round(gained / codes.length) : 0;
    for (const code of codes) {
      const attr = hunter.attributes.find((a) => a.code === code);
      if (!attr) continue;
      const res = applyAttrXp(attr.level, attr.xp, per, g.level);
      await prisma.attribute.update({ where: { id: attr.id }, data: { level: res.level, xp: res.xp } });
      if (res.leveledUp) levelUps.push({ code: attr.code, name: attr.name, level: res.level });
    }
    await prisma.hunter.update({ where: { id: hunter.id }, data: { globalLevel: g.level, globalXp: g.xp, gold: hunter.gold + Math.round(gained / 3) } });
    const owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);
    const it = rollLoot(owned, "S", () => 0);
    if (it) { await prisma.inventoryItem.create({ data: { hunterId: hunter.id, itemKey: it.key } }).catch(() => {}); drop = { key: it.key, name: it.name, rarity: it.rarity }; }
  }
  await prisma.weekly.update({ where: { id: weekly.id }, data: { stepsJson: JSON.stringify(steps), status: newStatus } });
  return NextResponse.json({ ok: true, rewarded, gained, levelUps, drop });
}
