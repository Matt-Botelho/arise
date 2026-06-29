import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { previousDay, penaltyFor, xpAfterPenalty } from "@/lib/game";
import type { PenaltyIntensity } from "@/lib/game.config";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.SYSTEM_CRON_SECRET || "change-me";
  return req.headers.get("x-system-secret") === secret;
}

async function runTick() {
  const hunter = await prisma.hunter.findFirst({ include: { attributes: true } });
  if (!hunter) return { error: "Aucun chasseur" };

  const today = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const target = previousDay(today); // le jour qui vient de se terminer

  if (hunter.lastRollover && hunter.lastRollover >= target) {
    return { ok: true, message: "Deja traite", day: target };
  }

  const mandatory = await prisma.quest.findMany({
    where: { hunterId: hunter.id, active: true, isMandatory: true },
  });
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: target } });
  const logged = new Set(logs.map((l) => l.questId));

  const intensity = hunter.penaltyIntensity as PenaltyIntensity;
  let hpLost = 0, xpLost = 0, failures = 0, streakReset = false;

  for (const q of mandatory) {
    if (logged.has(q.id)) continue;
    failures++;
    const pen = penaltyFor(intensity, q.baseXp);
    hpLost += pen.hpLoss;
    if (pen.resetStreak) streakReset = true;

    await prisma.questLog.create({
      data: { questId: q.id, hunterId: hunter.id, date: target, status: "failed", xpAwarded: 0 },
    });

    const codes: string[] = JSON.parse(q.attributeCodes || "[]");
    for (const code of codes) {
      const attr = hunter.attributes.find((a) => a.code === code);
      if (!attr) continue;
      const res = xpAfterPenalty(attr.level, attr.xp, pen.xpLoss);
      if (res.xp !== attr.xp) {
        await prisma.attribute.update({ where: { id: attr.id }, data: { xp: res.xp } });
        attr.xp = res.xp;
        xpLost += pen.xpLoss;
      }
    }

    await prisma.penalty.create({
      data: {
        hunterId: hunter.id, date: target,
        reason: "Quete obligatoire ratee : " + q.title,
        hpLost: pen.hpLoss, xpLost: pen.xpLoss,
      },
    });
  }

  let newStreak = hunter.streak;
  if (mandatory.length > 0) {
    if (failures === 0) newStreak = hunter.streak + 1;
    else if (streakReset) newStreak = 0;
  }

  const afterLoss = Math.max(0, hunter.hp - hpLost);
  const regen = failures === 0 && mandatory.length > 0 ? 20 : 0;
  const finalHp = Math.min(hunter.maxHp, afterLoss + regen);

  await prisma.hunter.update({
    where: { id: hunter.id },
    data: { hp: finalHp, streak: newStreak, lastRollover: target },
  });

  return { ok: true, day: target, failures, hpLost, xpLost, streak: newStreak, hp: finalHp };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await runTick());
}
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await runTick());
}
