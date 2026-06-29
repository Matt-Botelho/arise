import assert from "node:assert";
import { xpForLevel, applyXp, checkPromotion, nextRank, totalPower, promotionProgress, previousDay, penaltyFor, xpAfterPenalty, isExhausted } from "../src/lib/game";
let passed = 0;
function check(n: string, c: boolean){ assert.ok(c, "ECHEC: " + n); passed++; console.log("  ok - " + n); }

check("xpForLevel(1)=100", xpForLevel(1) === 100);
check("xpForLevel(2)=283", xpForLevel(2) === 283);
check("xpForLevel(5)=1118", xpForLevel(5) === 1118);
check("xpForLevel(20)=8944", xpForLevel(20) === 8944);
let r = applyXp(1,0,100); check("100XP niv1->niv2", r.level===2 && r.xp===0);
r = applyXp(1,0,393); check("393XP cascade niv3 reste10", r.level===3 && r.xp===10 && r.levelsGained===2);
let p = checkPromotion("F",[{code:"FOR",level:5},{code:"VIT",level:4}]); check("F->E bloque", !p.eligible && p.missing.length===1);
p = checkPromotion("F",[{code:"FOR",level:5},{code:"VIT",level:6}]); check("F->E ok", p.eligible);
check("nextRank(S)=null", nextRank("S")===null);
check("totalPower", totalPower([{level:3},{level:7}])===10);
// Phase 2
check("previousDay mois (2026-03-01->2026-02-28)", previousDay("2026-03-01")==="2026-02-28");
check("previousDay annee (2026-01-01->2025-12-31)", previousDay("2026-01-01")==="2025-12-31");
check("penaltyFor fidele/80 -> hp20 xp8 reset", (()=>{const x=penaltyFor("fidele",80);return x.hpLoss===20&&x.xpLoss===8&&x.resetStreak;})());
check("penaltyFor off -> 0", (()=>{const x=penaltyFor("off",80);return x.hpLoss===0&&x.xpLoss===0;})());
check("xpAfterPenalty plancher 0 sans de-level", (()=>{const x=xpAfterPenalty(3,50,80);return x.level===3&&x.xp===0;})());
check("isExhausted", isExhausted(0) && !isExhausted(5));
console.log("\n" + passed + " tests OK");
