import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totalPower, isExhausted, xpForLevel, previousDay } from "@/lib/game";
import { rankCeiling, nextRank, rankUpGate, globalXpForLevel } from "@/lib/progression";
import { gameDay } from "@/lib/date";
import { computeSetBonuses } from "@/lib/sets";
import { stageFor, nextStage, isFed, DEFAULT_SHADOW, type ShadowState } from "@/lib/shadow";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst({ include: { attributes: { orderBy: { order: "asc" } } } });
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur. Lance `npm run seed`." }, { status: 404 });

  // Migration douce vers le niveau global : aligne sur l'attribut le plus haut (une seule fois)
  if (hunter.globalLevel <= 1 && hunter.globalXp === 0) {
    const maxAttr = hunter.attributes.reduce((m, a) => Math.max(m, a.level), 1);
    if (maxAttr > 1) {
      const initial = Math.min(rankCeiling(hunter.rank), maxAttr);
      await prisma.hunter.update({ where: { id: hunter.id }, data: { globalLevel: initial } });
      hunter.globalLevel = initial;
    }
  }

  // Ancienne quête "rankup" -> désactivée (le passage de rang se fait par donjon)
  await prisma.quest.updateMany({ where: { hunterId: hunter.id, type: "rankup", active: true }, data: { active: false } }).catch(() => {});

  const ceiling = rankCeiling(hunter.rank);
  const target = nextRank(hunter.rank);
  const minAttrLevel = hunter.attributes.length ? Math.min(...hunter.attributes.map((a) => a.level)) : 0;
  const gate = rankUpGate(hunter.globalLevel, hunter.rank, minAttrLevel);

  const penalties = await prisma.penalty.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "desc" }, take: 5 });

  // Ombre-compagnon + panoplies équipées (auras).
  const today = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  let shadowState: ShadowState = DEFAULT_SHADOW;
  try { if (hunter.shadowJson) shadowState = JSON.parse(hunter.shadowJson); } catch {}
  const sStage = stageFor(shadowState.essence);
  const sNext = nextStage(shadowState.essence);
  const fed = isFed(shadowState, today, previousDay(today));
  let equipped: Record<string, { key: string } | null> = {};
  try { if (hunter.equippedJson) equipped = JSON.parse(hunter.equippedJson); } catch {}
  const sets = computeSetBonuses(equipped);

  return NextResponse.json({
    shadow: {
      essence: shadowState.essence, fed,
      stage: { key: sStage.key, name: sStage.name, xpPct: sStage.xpPct, desc: sStage.desc },
      next: sNext ? { name: sNext.name, at: sNext.at } : null,
    },
    sets: { active: sets.active, completed: sets.completed, xpPct: sets.xpPct, goldPct: sets.goldPct, lootPct: sets.lootPct },
    mereons: hunter.mereons,
    bestWeekScore: hunter.bestWeekScore,
    hunter: {
      name: hunter.name, rank: hunter.rank,
      globalLevel: hunter.globalLevel, globalXp: hunter.globalXp, globalXpNext: globalXpForLevel(hunter.globalLevel),
      ceiling, nextRank: target, rankUpAvailable: gate.ready, attrThreshold: gate.threshold, minAttrLevel, levelReady: gate.levelOk, attrsReady: gate.attrsOk,
      hp: hunter.hp, maxHp: hunter.maxHp, mp: hunter.mp, maxMp: hunter.maxMp,
      gold: hunter.gold, title: hunter.title, streak: hunter.streak, exhausted: isExhausted(hunter.hp), onboarded: hunter.onboarded,
    },
    attributes: hunter.attributes.map((a) => ({ ...a, xpNext: xpForLevel(a.level), capped: a.level >= hunter.globalLevel })),
    power: totalPower(hunter.attributes),
    penalties,
  });
}
