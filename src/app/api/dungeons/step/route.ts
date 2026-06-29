import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyXp } from "@/lib/game";
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

  const steps: DungeonStep[] = JSON.parse(dungeon.stepsJson || "[]");
  if (b.index < 0 || b.index >= steps.length) return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  steps[b.index].done = !steps[b.index].done;

  const prog = dungeonProgress(steps);
  const wasCleared = dungeon.status === "cleared";
  const levelUps: { code: string; name: string; level: number }[] = [];
  let newStatus = dungeon.status;

  if (prog.cleared && !wasCleared) {
    newStatus = "cleared";
    const codes: string[] = JSON.parse(dungeon.attributeCodes || "[]");
    const per = codes.length > 0 ? Math.round(dungeon.rewardXp / codes.length) : 0;
    for (const code of codes) {
      const attr = hunter.attributes.find((a) => a.code === code);
      if (!attr) continue;
      const res = applyXp(attr.level, attr.xp, per);
      await prisma.attribute.update({ where: { id: attr.id }, data: { level: res.level, xp: res.xp } });
      if (res.leveledUp) levelUps.push({ code: attr.code, name: attr.name, level: res.level });
    }
    await prisma.hunter.update({ where: { id: hunter.id }, data: { gold: hunter.gold + Math.round(dungeon.rewardXp / 5) } });
  } else if (!prog.cleared && wasCleared) {
    newStatus = "active";
  }

  await prisma.dungeon.update({ where: { id: dungeon.id }, data: { stepsJson: JSON.stringify(steps), status: newStatus } });
  return NextResponse.json({ ok: true, cleared: prog.cleared && !wasCleared, levelUps });
}
