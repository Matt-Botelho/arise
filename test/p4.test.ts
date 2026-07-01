import assert from "node:assert";
import { evaluateAchievements, dungeonProgress, ACHIEVEMENTS } from "../src/lib/achievements";
let n = 0; const ok = (name: string, c: boolean) => { assert.ok(c, "ECHEC: " + name); n++; console.log("  ok - " + name); };

const base = { rankIndex: 0, globalLevel: 1, maxAttrLevel: 1, minAttrLevel: 1, totalPower: 9, streak: 0, questsDone: 0, dungeonsCleared: 0, gatesCleared: 0, setsOwned: 0, shadowEssence: 0, mereons: 0, bestWeekScore: 0 };
let e = evaluateAchievements(base);
ok("debut: aucun succes (sauf rien)", e.filter((a) => a.unlocked).length === 0);

e = evaluateAchievements({ ...base, questsDone: 1 });
ok("first_quest debloque a 1 quete", !!e.find((a) => a.key === "first_quest" && a.unlocked));

e = evaluateAchievements({ ...base, rankIndex: 4 });
ok("rank_B debloque a rangIndex 4", !!e.find((a) => a.key === "rank_B" && a.unlocked) && !!e.find((a) => a.key === "rank_E" && a.unlocked));

e = evaluateAchievements({ ...base, minAttrLevel: 5 });
ok("balanced_5 debloque si min >=5", !!e.find((a) => a.key === "balanced_5" && a.unlocked));

const p = dungeonProgress([{ label: "a", done: true }, { label: "b", done: false }]);
ok("dungeonProgress 1/2 non cleared", p.done === 1 && p.total === 2 && !p.cleared);
const p2 = dungeonProgress([{ label: "a", done: true }, { label: "b", done: true }]);
ok("dungeonProgress 2/2 cleared", p2.cleared && p2.ratio === 1);

e = evaluateAchievements({ ...base, gatesCleared: 15, shadowEssence: 30, setsOwned: 3, mereons: 30, bestWeekScore: 420 });
ok("succes V2 debloques (portes/ombre/sets/mereons/semaine)",
  ["gate_1", "gates_15", "shadow_7", "shadow_30", "set_first", "sets_3", "mereons_30", "week_S"].every((k) => e.find((a) => a.key === k && a.unlocked)));

ok("30 succes definis", ACHIEVEMENTS.length === 30);
console.log("\n" + n + " tests OK");
