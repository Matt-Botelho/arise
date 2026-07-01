import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { previousDay, penaltyFor, xpAfterPenalty } from "@/lib/game";
import { sendPushToAll } from "@/lib/push";
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
  const target = previousDay(today);
  if (hunter.lastRollover && hunter.lastRollover >= target) {
    return { ok: true, message: "Deja traite", day: target };
  }

  const mandatory = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, isMandatory: true } });
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: target } });
  const logged = new Set(logs.map((l) => l.questId));
  const missed = mandatory.filter((q) => !logged.has(q.id));
  const failures = missed.length;

  const intensity = hunter.penaltyIntensity as PenaltyIntensity;
  const consumables = hunter.consumablesJson ? JSON.parse(hunter.consumablesJson) : {};
  let wardUsed = false, shieldUsed = false;
  if (failures > 0) {
    if ((consumables.penalty_ward || 0) > 0) { wardUsed = true; consumables.penalty_ward -= 1; }
    if ((consumables.streak_shield || 0) > 0) { shieldUsed = true; consumables.streak_shield -= 1; }
  }

  let hpLost = 0, xpLost = 0, streakReset = false;
  for (const q of missed) {
    await prisma.questLog.create({ data: { questId: q.id, hunterId: hunter.id, date: target, status: "failed", xpAwarded: 0 } });
    if (wardUsed) {
      await prisma.penalty.create({ data: { hunterId: hunter.id, date: target, reason: "Raté — protégé par le Système : " + q.title, hpLost: 0, xpLost: 0 } });
      continue;
    }
    const pen = penaltyFor(intensity, q.baseXp);
    hpLost += pen.hpLoss;
    if (pen.resetStreak) streakReset = true;
    const codes: string[] = JSON.parse(q.attributeCodes || "[]");
    for (const code of codes) {
      const attr = hunter.attributes.find((a) => a.code === code);
      if (!attr) continue;
      const res = xpAfterPenalty(attr.level, attr.xp, pen.xpLoss);
      if (res.xp !== attr.xp) { await prisma.attribute.update({ where: { id: attr.id }, data: { xp: res.xp } }); attr.xp = res.xp; xpLost += pen.xpLoss; }
    }
    await prisma.penalty.create({ data: { hunterId: hunter.id, date: target, reason: "Quete obligatoire ratee : " + q.title, hpLost: pen.hpLoss, xpLost: pen.xpLoss } });
  }

  let newStreak = hunter.streak;
  if (mandatory.length > 0) {
    if (failures === 0) newStreak = hunter.streak + 1;
    else if (!shieldUsed && streakReset) newStreak = 0;
  }

  const afterLoss = Math.max(0, hunter.hp - hpLost);
  const regen = failures === 0 && mandatory.length > 0 ? 20 : 0;
  const finalHp = Math.min(hunter.maxHp, afterLoss + regen);

  await prisma.hunter.update({
    where: { id: hunter.id },
    data: { hp: finalHp, streak: newStreak, lastRollover: target, consumablesJson: JSON.stringify(consumables) },
  });

  let summary: string;
  if (failures === 0) summary = mandatory.length > 0 ? "Journee validee, Chasseur. Serie : " + newStreak + " 🔥" : "Une nouvelle journee commence.";
  else if (wardUsed || shieldUsed) summary = "⚠ Jour manqué, mais tes protections ont amorti le coup." + (shieldUsed ? " Série sauvée." : "") + (wardUsed ? " Pénalité annulée." : "");
  else summary = "⚠ Zone de penalite : " + failures + " quete(s) ratee(s), -" + hpLost + " PV.";
  await sendPushToAll({ title: "Le Système", body: summary, url: "/" });

  return { ok: true, day: target, failures, hpLost, xpLost, streak: newStreak, hp: finalHp, wardUsed, shieldUsed };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await runTick());
}
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await runTick());
}
