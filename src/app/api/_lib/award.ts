// Cœur SERVEUR de la boucle de récompense (partagé par quests/complete, integrations/health,
// weeklies/step, objectives/step). Centralise : bonus d'équipement + panoplies + exo forge +
// Ombre + Serments + buffs, pity timer, cartes de loot enrichies, offrande d'Almanax.
// (Dossier _lib : pas une route. Les types Prisma frais n'existent qu'au build Docker.)
import { prisma } from "@/lib/prisma";
import { DIFFICULTY_MULT } from "@/lib/game.config";
import { isExhausted, previousDay } from "@/lib/game";
import { gameDay } from "@/lib/date";
import { rollLootWithPity, dropChance } from "@/lib/loot";
import { applyGlobalXp, applyAttrXp, rankCeiling, rankUpAvailable, themeForDay, DEFAULT_DAY_THEME } from "@/lib/progression";
import { computeBonuses } from "@/lib/effects";
import { computeSetBonuses, SET_BY_ITEM, setProgress, loreFor } from "@/lib/sets";
import { parseExo } from "@/lib/forge";
import { oathsStateFor, oathMultipliers, type OathsState } from "@/lib/oaths";
import { shadowBonus, DEFAULT_SHADOW, type ShadowState } from "@/lib/shadow";
import { almanaxStateFor, offeringSatisfied, OFFERING_BY_KEY, offeringFor, type AlmanaxState, type OfferingCtx } from "@/lib/almanax";

export type DropInfo = {
  key: string; name: string; rarity: string; lore: string; pityTriggered: boolean;
  set: { key: string; name: string; color: string; owned: number; total: number } | null;
};
export type AlmanaxReward = { title: string; mereons: number; gold: number } | null;

function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

// Bonus totaux du chasseur (équipement + exo + panoplies + Ombre). Retourne aussi le détail.
export async function fullBonuses(hunter: { id: string; equippedJson: string | null; shadowJson: string | null; timezone: string; dayRolloverHour: number }) {
  const inv = await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } });
  const owned = inv.map((i) => i.itemKey);
  const plusByKey = Object.fromEntries(inv.map((i) => [i.itemKey, i.plus]));
  const exoByKey = Object.fromEntries(inv.map((i) => [i.itemKey, parseExo(i.exoJson)]));
  const equipped = parseJson(hunter.equippedJson, {});
  const base = computeBonuses(equipped, plusByKey, exoByKey);
  const sets = computeSetBonuses(equipped);
  const today = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const shadow = parseJson<ShadowState>(hunter.shadowJson, DEFAULT_SHADOW);
  const shadowPct = shadowBonus(shadow, today, previousDay(today));
  return {
    owned, inv, equipped, sets, shadowPct,
    xpPct: base.xpPct + sets.xpPct + shadowPct,
    goldPct: base.goldPct + sets.goldPct,
    lootPct: base.lootPct + sets.lootPct,
  };
}

// Construit le contexte d'offrande d'Almanax pour la journée courante.
async function offeringCtx(hunterId: string, day: string, dayThemeCode: string, evt: { weeklyStep?: boolean; objectiveStep?: boolean } = {}): Promise<OfferingCtx> {
  const quests = await prisma.quest.findMany({ where: { hunterId, active: true, type: { not: "rankup" } } });
  const logs = await prisma.questLog.findMany({ where: { hunterId, date: day, status: "done" } });
  const doneIds = new Set(logs.map((l) => l.questId));
  const doneQuests = quests.filter((q) => doneIds.has(q.id));
  const mandatoryDone = quests.some((q) => q.isMandatory && doneIds.has(q.id));
  const themeDone = doneQuests.some((q) => (parseJson<string[]>(q.attributeCodes, [])).includes(dayThemeCode));
  return {
    doneToday: doneQuests.length,
    totalActive: quests.length,
    mandatoryDone,
    themeDone,
    weeklyStep: !!evt.weeklyStep,
    objectiveStep: !!evt.objectiveStep,
  };
}

// Vérifie et complète l'offrande du jour si satisfaite. Idempotent. Crédite Méréons + or.
export async function checkAlmanax(hunterId: string, evt: { weeklyStep?: boolean; objectiveStep?: boolean } = {}): Promise<AlmanaxReward> {
  const hunter = await prisma.hunter.findUnique({ where: { id: hunterId } });
  if (!hunter) return null;
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const state = almanaxStateFor(day, parseJson<AlmanaxState | null>(hunter.almanaxJson, null));
  if (state.done) return null;
  const offer = OFFERING_BY_KEY[state.offerKey] || offeringFor(day);
  const weekday = new Date(day + "T12:00:00").getDay();
  const themeMap = parseJson(hunter.dayThemeJson, DEFAULT_DAY_THEME);
  const ctx = await offeringCtx(hunterId, day, themeForDay(weekday, themeMap), evt);
  if (!offeringSatisfied(offer.key, ctx)) return null;
  await prisma.hunter.update({
    where: { id: hunter.id },
    data: {
      almanaxJson: JSON.stringify({ ...state, done: true }),
      mereons: hunter.mereons + offer.mereons,
      gold: hunter.gold + offer.gold,
    },
  });
  return { title: offer.title, mereons: offer.mereons, gold: offer.gold };
}

export type CompleteResult = {
  ok: true;
  gained: number; goldGain: number; exhausted: boolean;
  globalLevel: number; globalLeveledUp: boolean; atCeiling: boolean; rankUpReady: boolean;
  levelUps: { code: string; name: string; level: number }[];
  drop: DropInfo | null;
  objective: { id: string; title: string; progress: number; target: number; justCompleted: boolean } | null;
  almanax: AlmanaxReward;
  oathMult: number;
  auto?: boolean;
} | { error: string; status: number };

// Complète une quête pour la journée courante (source manuelle ou automatique).
export async function completeQuest(questId: string, opts: { auto?: boolean } = {}): Promise<CompleteResult> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return { error: "Quête introuvable", status: 404 };
  const hunter = await prisma.hunter.findUnique({ where: { id: quest.hunterId }, include: { attributes: true } });
  if (!hunter) return { error: "Chasseur introuvable", status: 404 };

  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const already = await prisma.questLog.findUnique({ where: { questId_date: { questId, date: day } } });
  if (already) return { error: "Déjà complétée aujourd'hui", status: 409 };

  const fb = await fullBonuses(hunter);
  const buffs = parseJson<Record<string, string>>(hunter.buffsJson, {});
  const nowMs = Date.now();
  const xp2x = !!(buffs.xp2xUntil && new Date(buffs.xp2xUntil).getTime() > nowMs);
  const luck2x = !!(buffs.luck2xUntil && new Date(buffs.luck2xUntil).getTime() > nowMs);
  const oaths: OathsState = oathsStateFor(day, parseJson<OathsState | null>(hunter.oathsJson, null));
  const om = oathMultipliers(oaths.keys);

  const mult = DIFFICULTY_MULT[quest.difficulty] ?? 1;
  const exhausted = isExhausted(hunter.hp);
  const gained = Math.round(quest.baseXp * mult * (exhausted ? 0.5 : 1) * (1 + fb.xpPct / 100) * (xp2x ? 2 : 1) * om.xp);

  const ceiling = rankCeiling(hunter.rank);
  const g = applyGlobalXp(hunter.globalLevel, hunter.globalXp, gained, ceiling);

  const codes = parseJson<string[]>(quest.attributeCodes, []);
  const per = codes.length > 0 ? Math.round(gained / codes.length) : 0;
  const levelUps: { code: string; name: string; level: number }[] = [];
  for (const code of codes) {
    const attr = hunter.attributes.find((a) => a.code === code);
    if (!attr) continue;
    const res = applyAttrXp(attr.level, attr.xp, per, g.level);
    if (res.level !== attr.level || res.xp !== attr.xp) {
      await prisma.attribute.update({ where: { id: attr.id }, data: { level: res.level, xp: res.xp } });
    }
    attr.level = res.level; attr.xp = res.xp;
    if (res.leveledUp) levelUps.push({ code: attr.code, name: attr.name, level: res.level });
  }

  await prisma.questLog.create({ data: { questId, hunterId: hunter.id, date: day, status: "done", xpAwarded: gained } });

  const goldGain = Math.round((gained / 5) * (1 + fb.goldPct / 100) * om.gold);
  const newHp = Math.min(hunter.maxHp, hunter.hp + 2);

  // Loot avec pity timer (drop épique+ garanti après une série d'échecs).
  const chanceBonus = fb.lootPct / 100 + (luck2x ? dropChance(quest.difficulty) : 0);
  const roll = rollLootWithPity(fb.owned, quest.difficulty, Math.random, chanceBonus, hunter.pityCounter ?? 0);
  let drop: DropInfo | null = null;
  if (roll.item) {
    const it = roll.item;
    await prisma.inventoryItem.upsert({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: it.key } }, update: { qty: { increment: 1 } }, create: { hunterId: hunter.id, itemKey: it.key } });
    const set = SET_BY_ITEM[it.key] || null;
    const ownedAfter = new Set([...fb.owned, it.key]);
    drop = {
      key: it.key, name: it.name, rarity: it.rarity,
      lore: loreFor(it.key, it.rarity), pityTriggered: roll.pityTriggered,
      set: set ? { key: set.key, name: set.name, color: set.color, ...setProgress(set, ownedAfter) } : null,
    };
  }

  await prisma.hunter.update({ where: { id: hunter.id }, data: { gold: hunter.gold + goldGain, hp: newHp, globalLevel: g.level, globalXp: g.xp, pityCounter: roll.pity } });

  let objective: { id: string; title: string; progress: number; target: number; justCompleted: boolean } | null = null;
  if (quest.objectiveId) {
    const obj = await prisma.objective.findUnique({ where: { id: quest.objectiveId } });
    if (obj && obj.kind !== "metric") {
      const linked = await prisma.quest.findMany({ where: { objectiveId: obj.id }, select: { id: true } });
      const progress = await prisma.questLog.count({ where: { status: "done", questId: { in: linked.map((q) => q.id) } } });
      const justCompleted = obj.status !== "done" && progress >= obj.targetCount;
      if (justCompleted) await prisma.objective.update({ where: { id: obj.id }, data: { status: "done" } });
      objective = { id: obj.id, title: obj.title, progress, target: obj.targetCount, justCompleted };
    }
  }

  const almanax = await checkAlmanax(hunter.id);

  return {
    ok: true, gained, goldGain, exhausted,
    globalLevel: g.level, globalLeveledUp: g.leveledUp, atCeiling: g.atCeiling,
    rankUpReady: rankUpAvailable(g.level, hunter.rank),
    levelUps, drop, objective, almanax,
    oathMult: Math.round(om.xp * 100) / 100,
    auto: !!opts.auto,
  };
}
