import assert from "node:assert";
import {
  xpForLevel,
  applyXp,
  checkPromotion,
  nextRank,
  totalPower,
  promotionProgress,
} from "../src/lib/game";

let passed = 0;
function check(name: string, cond: boolean) {
  assert.ok(cond, "ECHEC: " + name);
  passed++;
  console.log("  ok - " + name);
}

// Courbe d'XP : round(100 * L^1.5)
check("xpForLevel(1) = 100", xpForLevel(1) === 100);
check("xpForLevel(2) = 283", xpForLevel(2) === 283);
check("xpForLevel(5) = 1118", xpForLevel(5) === 1118);
check("xpForLevel(10) = 3162", xpForLevel(10) === 3162);
check("xpForLevel(20) = 8944", xpForLevel(20) === 8944);

// applyXp
let r = applyXp(1, 0, 50);
check("50 XP au niv.1 ne fait pas monter", r.level === 1 && r.xp === 50 && !r.leveledUp);
r = applyXp(1, 0, 100);
check("100 XP au niv.1 -> niv.2 reste 0", r.level === 2 && r.xp === 0 && r.levelsGained === 1);
r = applyXp(1, 50, 100);
check("150 XP cumule -> niv.2 reste 50", r.level === 2 && r.xp === 50);
r = applyXp(1, 0, 100 + 283 + 10);
check("393 XP -> niv.3 (cascade) reste 10", r.level === 3 && r.xp === 10 && r.levelsGained === 2);

// Promotion
const low = [{ code: "FOR", level: 5 }, { code: "VIT", level: 4 }];
let p = checkPromotion("F", low);
check("F->E bloque si un attribut < 5", p.nextRank === "E" && !p.eligible && p.missing.length === 1);
const ok = [{ code: "FOR", level: 5 }, { code: "VIT", level: 6 }];
p = checkPromotion("F", ok);
check("F->E debloque si tous >= 5", p.eligible && p.nextRank === "E");

// nextRank
check("nextRank(F) = E", nextRank("F") === "E");
check("nextRank(S) = null", nextRank("S") === null);

// totalPower / progress
check("totalPower somme les niveaux", totalPower([{ level: 3 }, { level: 7 }]) === 10);
check("progress F->E a 50% si niveaux a 2.5/5", Math.abs(promotionProgress("F", [{ level: 2.5 }, { level: 2.5 }]) - 0.5) < 1e-9);

console.log("\n" + passed + " tests OK");
