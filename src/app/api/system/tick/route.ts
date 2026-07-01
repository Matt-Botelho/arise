import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay, weekKeyOf, monthKeyOf } from "@/lib/date";
import { previousDay, penaltyFor, xpAfterPenalty } from "@/lib/game";
import { sendPushToAll } from "@/lib/push";
import type { PenaltyIntensity } from "@/lib/game.config";
import { oathsStateFor, checkOath, OATH_BY_KEY, type OathsState } from "@/lib/oaths";
import { feed, DEFAULT_SHADOW, type ShadowState } from "@/lib/shadow";
import { maybeSpawnGate, DEFAULT_GATE_POOL, riftForMonth } from "@/lib/gates";
import { weekScore, weekGrade, RECORD_REWARD } from "@/lib/weekscore";
import { offeringFor } from "@/lib/almanax";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.SYSTEM_CRON_SECRET || "change-me";
  return req.headers.get("x-system-secret") === secret;
}

function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

// Heure locale (0-23) d'un instant, dans le fuseau du chasseur.
function hourIn(tz: string, d: Date): number {
  const h = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", hour12: false }).format(d);
  return parseInt(h, 10) || 0;
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
  const allActive = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, type: { not: "rankup" } } });
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: target } });
  const logged = new Set(logs.map((l) => l.questId));
  const missed = mandatory.filter((q) => !logged.has(q.id));
  const failures = missed.length;

  const intensity = hunter.penaltyIntensity as PenaltyIntensity;
  const consumables = parseJson<Record<string, number>>(hunter.consumablesJson, {});
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
    const codes: string[] = parseJson(q.attributeCodes, []);
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

  // --- Serments de la journée écoulée : évalués maintenant. ---
  const oaths: OathsState = oathsStateFor(target, parseJson<OathsState | null>(hunter.oathsJson, null));
  let oathHpLost = 0, oathGoldLost = 0;
  const oathsFailed: string[] = [];
  if (oaths.date === target && oaths.keys.length) {
    const doneLogs = logs.filter((l) => l.status === "done");
    const mandatoryLog = doneLogs.find((l) => mandatory.some((q) => q.id === l.questId));
    const ctx = {
      doneCount: doneLogs.length,
      totalActive: allActive.length,
      mandatoryDoneBeforeHour: !!mandatoryLog && hourIn(hunter.timezone, mandatoryLog.createdAt) < 14,
    };
    for (const key of oaths.keys) {
      if (checkOath(key, ctx)) continue;
      const def = OATH_BY_KEY[key];
      if (!def) continue;
      oathsFailed.push(def.name);
      oathHpLost += def.failHp;
      oathGoldLost += def.failGold;
      await prisma.penalty.create({ data: { hunterId: hunter.id, date: target, reason: "Serment rompu : " + def.name, hpLost: def.failHp, xpLost: 0 } });
    }
  }

  // --- Ombre-compagnon : nourrie par une journée parfaite. ---
  let shadow: ShadowState = parseJson(hunter.shadowJson, DEFAULT_SHADOW);
  let shadowEvolved: string | null = null;
  const perfectDay = mandatory.length > 0 && failures === 0;
  if (perfectDay) {
    const fedRes = feed(shadow, target);
    shadow = fedRes.state;
    if (fedRes.evolved) shadowEvolved = fedRes.evolved.name;
  }

  // --- Note de semaine (au premier tick de la semaine, pour la semaine écoulée). ---
  let weekResult: { grade: string; score: number; record: boolean } | null = null;
  if (weekKeyOf(today) !== weekKeyOf(target)) {
    const wk = weekKeyOf(target);
    const weekLogs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: { gte: wk, lte: target } } });
    const done = weekLogs.filter((l) => l.status === "done").length;
    const failed = weekLogs.filter((l) => l.status === "failed").length;
    const byDay: Record<string, { done: number; failed: number }> = {};
    for (const l of weekLogs) {
      (byDay[l.date] ||= { done: 0, failed: 0 });
      if (l.status === "done") byDay[l.date].done++; else if (l.status === "failed") byDay[l.date].failed++;
    }
    const perfectDays = Object.values(byDay).filter((d) => d.done > 0 && d.failed === 0).length;
    const score = weekScore({ done, failed, perfectDays });
    const grade = weekGrade(score);
    await prisma.weekScore.upsert({
      where: { hunterId_weekKey: { hunterId: hunter.id, weekKey: wk } },
      update: { score, grade },
      create: { hunterId: hunter.id, weekKey: wk, score, grade },
    });
    const record = score > hunter.bestWeekScore;
    weekResult = { grade, score, record };
  }

  // --- Porte du jour (1 chance sur 3, épreuve surprise du pool configuré). ---
  let gateSpawned: { title: string; rank: string; label: string } | null = null;
  const existingGate = await prisma.gate.findUnique({ where: { hunterId_date: { hunterId: hunter.id, date: today } } }).catch(() => null);
  if (!existingGate) {
    const pool = parseJson<string[]>(hunter.gatePoolJson, DEFAULT_GATE_POOL);
    const spawn = maybeSpawnGate(pool.length ? pool : DEFAULT_GATE_POOL);
    if (spawn) {
      await prisma.gate.create({ data: { hunterId: hunter.id, date: today, rank: spawn.rank, title: spawn.title, gold: spawn.gold, xp: spawn.xp } });
      gateSpawned = { title: spawn.title, rank: spawn.rank, label: spawn.label };
    }
  }

  // --- Faille mensuelle : un mini-donjon spécial par mois. ---
  const mk = monthKeyOf(today);
  const rift = await prisma.dungeon.findFirst({ where: { hunterId: hunter.id, isRift: true, monthKey: mk } }).catch(() => null);
  let riftCreated: string | null = null;
  if (!rift) {
    const t = riftForMonth(mk);
    await prisma.dungeon.create({
      data: {
        hunterId: hunter.id, title: t.title + " — " + mk, description: t.description,
        rank: "B", stepsJson: JSON.stringify(t.steps.map((label) => ({ label, done: false }))),
        attributeCodes: "[]", rewardXp: 500, isRift: true, monthKey: mk,
      },
    });
    riftCreated = t.title;
  }

  const afterLoss = Math.max(0, hunter.hp - hpLost - oathHpLost);
  const regen = failures === 0 && mandatory.length > 0 ? 20 : 0;
  const finalHp = Math.min(hunter.maxHp, afterLoss + regen);

  await prisma.hunter.update({
    where: { id: hunter.id },
    data: {
      hp: finalHp, streak: newStreak, lastRollover: target,
      consumablesJson: JSON.stringify(consumables),
      gold: Math.max(0, hunter.gold - oathGoldLost + (weekResult?.record ? RECORD_REWARD.gold : 0)),
      shards: hunter.shards + (weekResult?.record ? RECORD_REWARD.shards : 0),
      bestWeekScore: weekResult?.record ? weekResult.score : hunter.bestWeekScore,
      shadowJson: JSON.stringify(shadow),
    },
  });

  // --- Résumé push du matin : bilan + Almanax + Porte. ---
  const parts: string[] = [];
  if (failures === 0) parts.push(mandatory.length > 0 ? "Journee validee. Serie : " + newStreak + " 🔥" : "Une nouvelle journee commence.");
  else if (wardUsed || shieldUsed) parts.push("⚠ Jour manqué, protections consommées." + (shieldUsed ? " Série sauvée." : ""));
  else parts.push("⚠ " + failures + " quete(s) ratee(s), -" + hpLost + " PV.");
  if (oathsFailed.length) parts.push("Serment rompu : " + oathsFailed.join(", ") + ".");
  if (shadowEvolved) parts.push("🐺 Ton Ombre a évolué : " + shadowEvolved + " !");
  else if (perfectDay) parts.push("Ton Ombre se nourrit de ta constance.");
  if (weekResult) parts.push("Note de semaine : " + weekResult.grade + " (" + weekResult.score + " pts)" + (weekResult.record ? " — RECORD ! +" + RECORD_REWARD.gold + " or" : "") + ".");
  if (gateSpawned) parts.push("⛩ " + gateSpawned.label + " s'est ouverte : « " + gateSpawned.title + " » — avant ce soir !");
  if (riftCreated) parts.push("🌌 " + riftCreated + " est apparue (onglet Donjons).");
  const offer = offeringFor(today);
  parts.push("Almanax : " + offer.title + " (+" + offer.mereons + " ❖).");
  await sendPushToAll({ title: "Le Système", body: parts.join(" "), url: "/quetes" });

  return { ok: true, day: target, failures, hpLost, xpLost, streak: newStreak, hp: finalHp, wardUsed, shieldUsed, oathsFailed, shadowEvolved, weekResult, gateSpawned, riftCreated };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await runTick());
}
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await runTick());
}
