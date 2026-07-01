import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay, periodKeyFor } from "@/lib/date";
import { applyGlobalXp, applyAttrXp, rankCeiling } from "@/lib/progression";
import { checkAlmanax } from "@/app/api/_lib/award";

export const dynamic = "force-dynamic";
type St = { label: string; done: boolean };

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; index?: number };
  if (!b.id || typeof b.index !== "number") return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  const obj = await prisma.objective.findUnique({ where: { id: b.id } });
  if (!obj || obj.kind !== "checklist") return NextResponse.json({ error: "Objectif checklist introuvable" }, { status: 404 });
  const hunter = await prisma.hunter.findUnique({ where: { id: obj.hunterId }, include: { attributes: true } });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });

  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const pkey = periodKeyFor(obj.recurrence, day);
  let steps: St[] = JSON.parse(obj.stepsJson || "[]");
  if (obj.recurrence !== "once" && obj.periodKey !== pkey) steps = steps.map((s) => ({ ...s, done: false }));
  if (b.index < 0 || b.index >= steps.length) return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  steps[b.index].done = !steps[b.index].done;

  const allDone = steps.length > 0 && steps.every((s) => s.done);
  let gained = 0;
  let leveledUp = false;
  const levelUps: { name: string; level: number }[] = [];
  let status = obj.status;
  let lastRewardKey = obj.lastRewardKey;

  if (allDone && obj.lastRewardKey !== pkey) {
    gained = obj.baseXp;
    const g = applyGlobalXp(hunter.globalLevel, hunter.globalXp, gained, rankCeiling(hunter.rank));
    const attr = hunter.attributes.find((a) => a.code === obj.attributeCode);
    if (attr) {
      const res = applyAttrXp(attr.level, attr.xp, gained, g.level);
      await prisma.attribute.update({ where: { id: attr.id }, data: { level: res.level, xp: res.xp } });
      if (res.leveledUp) levelUps.push({ name: attr.name, level: res.level });
    }
    await prisma.hunter.update({ where: { id: hunter.id }, data: { globalLevel: g.level, globalXp: g.xp, gold: hunter.gold + Math.round(gained / 5) } });
    leveledUp = g.leveledUp;
    lastRewardKey = pkey;
    if (obj.recurrence === "once") status = "done";
  }

  await prisma.objective.update({ where: { id: obj.id }, data: { stepsJson: JSON.stringify(steps), periodKey: pkey, lastRewardKey, status } });
  const almanax = steps[b.index].done ? await checkAlmanax(hunter.id, { objectiveStep: true }) : null;
  return NextResponse.json({ ok: true, gained, allDone, leveledUp, levelUps, status, almanax });
}
