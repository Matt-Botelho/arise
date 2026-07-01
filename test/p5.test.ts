// Tests P5 : santé, panoplies, almanax, serments, ombre, portes, forge, note de semaine, pity.
import assert from "node:assert";
import { canonicalMetric, normalizeValue, aggregate, autoQuestSatisfied, parseHealthPayload } from "../src/lib/health";
import { SETS, computeSetBonuses, setProgress, validateSets, loreFor } from "../src/lib/sets";
import { offeringFor, almanaxStateFor, offeringSatisfied, dayHash, TEMPLE_ITEMS } from "../src/lib/almanax";
import { oathsStateFor, oathMultipliers, checkOath, OATHS } from "../src/lib/oaths";
import { stageFor, nextStage, feed, isFed, shadowBonus, DEFAULT_SHADOW } from "../src/lib/shadow";
import { maybeSpawnGate, DEFAULT_GATE_POOL, riftForMonth } from "../src/lib/gates";
import { breakResult, rollForge, applyRune, parseRunes, parseExo, canReceiveRune } from "../src/lib/forge";
import { weekScore, weekGrade } from "../src/lib/weekscore";
import { rollLootWithPity, PITY_THRESHOLD } from "../src/lib/loot";
import { computeBonuses } from "../src/lib/effects";

let n = 0; const ok = (name: string, c: boolean) => { assert.ok(c, "ECHEC: " + name); n++; console.log("  ok - " + name); };

// --- Santé ---
ok("canonicalMetric step_count → steps", canonicalMetric("step_count") === "steps");
ok("canonicalMetric Weight Body Mass → weight", canonicalMetric("Weight Body Mass") === "weight");
ok("canonicalMetric inconnue → null", canonicalMetric("blood_type") === null);
ok("normalizeValue lb → kg", Math.abs(normalizeValue("weight", 200, "lb") - 90.72) < 0.01);
ok("aggregate steps = somme", aggregate("steps", [1000, 2000, 500]) === 3500);
ok("aggregate weight = dernière", aggregate("weight", [86, 85.4]) === 85.4);
ok("autoQuestSatisfied 8500 ≥ 8000", autoQuestSatisfied(8500, 8000) && !autoQuestSatisfied(7000, 8000));
const payload = { data: { metrics: [
  { name: "step_count", units: "count", data: [{ date: "2026-07-01 08:00:00 +0200", qty: 3000 }, { date: "2026-07-01 12:00:00 +0200", qty: 4500 }] },
  { name: "weight_body_mass", units: "kg", data: [{ date: "2026-07-01 07:30:00 +0200", qty: 85.6 }] },
  { name: "unknown_metric", units: "x", data: [{ date: "2026-07-01 07:30:00 +0200", qty: 1 }] },
] } };
const parsed = parseHealthPayload(payload);
ok("parseHealthPayload : 2 métriques reconnues", parsed.length === 2);
ok("parseHealthPayload : pas agrégés", parsed.find((p) => p.metric === "steps")?.value === 7500);
ok("parseHealthPayload : poids = dernière valeur", parsed.find((p) => p.metric === "weight")?.value === 85.6);

// --- Panoplies ---
ok("panoplies valides (slots uniques, clés connues)", validateSets().length === 0);
ok("6 panoplies définies", SETS.length === 6);
const vagabond = SETS.find((s) => s.key === "vagabond")!;
const eq2 = { cape: { key: "cape_cape_solid" }, feet: { key: "feet_boots_basic" } };
const sb2 = computeSetBonuses(eq2);
ok("2 pièces Vagabond → +3% XP", sb2.xpPct === 3 && sb2.completed.length === 0);
const eq4 = { cape: { key: "cape_cape_solid" }, feet: { key: "feet_boots_basic" }, legs: { key: "legs_formal" }, hair: { key: "hair_beards_5oclock_shadow" } };
const sb4 = computeSetBonuses(eq4);
ok("4 pièces Vagabond → complète (+8/+5/+3)", sb4.xpPct === 8 && sb4.goldPct === 5 && sb4.lootPct === 3 && sb4.completed.includes("vagabond"));
ok("setProgress 2/4", setProgress(vagabond, ["cape_cape_solid", "feet_boots_basic"]).owned === 2);
ok("loreFor retourne toujours une phrase", loreFor("weapon_scythe", "epique").length > 5 && loreFor("inconnu_xyz", "rare").length > 5);

// --- Almanax ---
ok("offeringFor déterministe", offeringFor("2026-07-01").key === offeringFor("2026-07-01").key && dayHash("2026-07-01") === dayHash("2026-07-01"));
ok("almanaxStateFor reset au changement de jour", almanaxStateFor("2026-07-02", { date: "2026-07-01", offerKey: "x", done: true }).done === false);
const octx = { doneToday: 5, totalActive: 6, mandatoryDone: true, themeDone: false, weeklyStep: false, objectiveStep: false };
ok("offrande cinq_quetes satisfaite à 5", offeringSatisfied("cinq_quetes", octx));
ok("offrande toutes_quetes non satisfaite 5/6", !offeringSatisfied("toutes_quetes", octx));
ok("Temple : 3 reliques", TEMPLE_ITEMS.length === 3);

// --- Serments ---
ok("3 serments définis", OATHS.length === 3);
ok("oathsStateFor reset au changement de jour", oathsStateFor("2026-07-02", { date: "2026-07-01", keys: ["aube"] }).keys.length === 0);
const om = oathMultipliers(["aube", "acier"]);
ok("multiplicateurs cumulés ×1.2×1.25", Math.abs(om.xp - 1.5) < 0.001);
ok("checkOath conquerant OK si tout validé", checkOath("conquerant", { doneCount: 4, totalActive: 4, mandatoryDoneBeforeHour: false }));
ok("checkOath aube échoue si tard", !checkOath("aube", { doneCount: 9, totalActive: 9, mandatoryDoneBeforeHour: false }));

// --- Ombre ---
ok("stade 0 = naissante, 30 = garou", stageFor(0).key === "naissante" && stageFor(30).key === "garou");
ok("nextStage(8) = garou à 30", nextStage(8)?.at === 30);
const f1 = feed({ essence: 6, lastFedDay: "2026-06-30" }, "2026-07-01");
ok("feed +1 essence, évolue à 7 (loup)", f1.state.essence === 7 && f1.evolved?.key === "loup");
ok("feed idempotent le même jour", feed(f1.state, "2026-07-01").state.essence === 7);
ok("isFed hier = true, il y a 2 jours = false", isFed({ essence: 1, lastFedDay: "2026-06-30" }, "2026-07-01", "2026-06-30") && !isFed({ essence: 1, lastFedDay: "2026-06-29" }, "2026-07-01", "2026-06-30"));
ok("shadowBonus nourrie = xpPct du stade", shadowBonus({ essence: 30, lastFedDay: "2026-07-01" }, "2026-07-01", "2026-06-30") === 4 && shadowBonus(DEFAULT_SHADOW, "2026-07-01", "2026-06-30") === 0);

// --- Portes ---
ok("pas de spawn si rnd > 1/3", maybeSpawnGate(DEFAULT_GATE_POOL, () => 0.9) === null);
const gate = maybeSpawnGate(DEFAULT_GATE_POOL, (() => { const seq = [0.1, 0.999, 0.5]; let i = 0; return () => seq[i++ % seq.length]; })());
ok("spawn : rang S sur jet extrême, titre du pool", !!gate && gate.rank === "S" && DEFAULT_GATE_POOL.includes(gate.title));
ok("riftForMonth déterministe", riftForMonth("2026-07").title === riftForMonth("2026-07").title);

// --- Forge ---
ok("breakResult arme → rune xp", breakResult("weapon_arming")?.type === "xp");
ok("breakResult légendaire → 3 runes", breakResult("legs_skirts_legion")?.count === 3);
ok("rollForge bornes", rollForge(() => 0.1) === "success" && rollForge(() => 0.7) === "neutral" && rollForge(() => 0.95) === "fail");
const exo = applyRune({ xpPct: 4, goldPct: 0, lootPct: 0 }, "xp", "success");
ok("applyRune succès +1", exo.exo.xpPct === 5 && exo.applied);
ok("canReceiveRune bloque à +5", !canReceiveRune({ xpPct: 5, goldPct: 0, lootPct: 0 }, "xp"));
ok("parseRunes/parseExo robustes", parseRunes("{invalid").xp === 0 && parseExo(null).goldPct === 0);
ok("computeBonuses intègre l'exo", computeBonuses({ weapon: { key: "weapon_arming" } }, {}, { weapon_arming: { xpPct: 3, goldPct: 0, lootPct: 0 } }).xpPct >= 3);

// --- Note de semaine ---
ok("weekScore compte done/parfaits/échecs", weekScore({ done: 20, failed: 2, perfectDays: 5 }) === 20 * 10 + 5 * 25 - 2 * 15);
ok("grades S/A/B/C", weekGrade(420) === "S" && weekGrade(300) === "A" && weekGrade(150) === "B" && weekGrade(50) === "C");

// --- Pity timer ---
const noLoot = () => 0.99; // jet raté à chaque fois
let pity = 0; let forced = false;
for (let i = 0; i < PITY_THRESHOLD; i++) {
  const r = rollLootWithPity([], "E", (() => { let first = true; return () => { if (first) { first = false; return 0.99; } return 0.5; }; })(), 0, pity);
  pity = r.pity;
  if (r.pityTriggered) { forced = r.item !== null; break; }
}
ok("pity déclenche un drop garanti au seuil", forced && pity === 0);
ok("un drop remet le pity à zéro", rollLootWithPity([], "S", () => 0.01, 1, 7).pity === 0);
void noLoot;

console.log("\n" + n + " tests OK");
