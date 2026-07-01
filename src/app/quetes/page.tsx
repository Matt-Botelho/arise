"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LootCard, { type LootDrop } from "@/components/LootCard";
import { ATTRIBUTES } from "@/lib/game.config";
import { setSfxEnabled, playXp, playLevelUp, playLoot, playObjective } from "@/lib/sfx";
import { METRIC_BY_KEY } from "@/lib/health";

type Quest = { id: string; title: string; type: string; attributeCodes: string[]; baseXp: number; difficulty: string; isMandatory: boolean; done: boolean; metricKey?: string | null; threshold?: number | null; todayValue?: number };
type Step = { label: string; done: boolean };
type Weekly = { id: string; title: string; description: string; steps: Step[]; attributeCodes: string[]; baseXp: number; status: string };
type LevelUp = { name: string; level: number };
type Almanax = { offering: { key: string; title: string; desc: string; mereons: number; gold: number; done: boolean }; themeCode: string; mereons: number };
type OathDef = { key: string; name: string; desc: string; icon: string; xpMult: number; goldMult: number };
type OathsInfo = { catalog: OathDef[]; active: string[]; locked: boolean; max: number };
type Gate = { id: string; rank: string; title: string; gold: number; xp: number; status: string; color: string };
type AlmanaxReward = { title: string; mereons: number; gold: number } | null;

export default function QuetesPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [weeklies, setWeeklies] = useState<Weekly[]>([]);
  const [day, setDay] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [burst, setBurst] = useState<string | null>(null);
  const [floatXp, setFloatXp] = useState<string | null>(null);
  const [dayThemeCode, setDayThemeCode] = useState("");
  const [almanax, setAlmanax] = useState<Almanax | null>(null);
  const [oaths, setOaths] = useState<OathsInfo | null>(null);
  const [oathPick, setOathPick] = useState<string[]>([]);
  const [gate, setGate] = useState<Gate | null>(null);
  const [drop, setDrop] = useState<LootDrop | null>(null);

  async function load() {
    const [q, w, al, oa, ga] = await Promise.all([
      fetch("/api/quests").then((r) => r.json()),
      fetch("/api/weeklies").then((r) => r.json()),
      fetch("/api/almanax").then((r) => r.json()).catch(() => null),
      fetch("/api/oaths").then((r) => r.json()).catch(() => null),
      fetch("/api/gates").then((r) => r.json()).catch(() => null),
    ]);
    setQuests(q.quests || []); setDay(q.day || "");
    setDayThemeCode(q.dayThemeCode || "");
    setSfxEnabled(q.sfxEnabled !== false);
    setWeeklies(w.weeklies || []);
    if (al && !al.error) setAlmanax(al);
    if (oa && !oa.error) setOaths(oa);
    setGate(ga && ga.gate ? ga.gate : null);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string, ms = 5000) { setToast(m); setTimeout(() => setToast(null), ms); }
  function almanaxMsg(a: AlmanaxReward): string { return a ? " · ❖ Offrande accomplie : " + a.title + " (+" + a.mereons + " ❖, +" + a.gold + " or)" : ""; }
  function celebrate(r: { gained?: number; globalLeveledUp?: boolean; globalLevel?: number; levelUps?: LevelUp[]; drop?: LootDrop | null; objective?: { justCompleted?: boolean } | null }) {
    if (typeof r.gained === "number") { setFloatXp("+" + r.gained + " XP"); setTimeout(() => setFloatXp(null), 1100); }
    const leveled = !!r.globalLeveledUp || !!(r.levelUps && r.levelUps.length);
    if (leveled) { playLevelUp(); setBurst(r.globalLeveledUp && r.globalLevel ? "NIVEAU " + r.globalLevel : "NIVEAU SUPÉRIEUR"); setTimeout(() => setBurst(null), 1400); }
    else { playXp(); }
    if (r.drop) { playLoot(r.drop.rarity); setDrop(r.drop); }
    if (r.objective?.justCompleted) playObjective();
  }

  async function complete(id: string) {
    const r = await fetch("/api/quests/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: id }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    celebrate(r);
    let msg = "+" + r.gained + " XP" + (r.oathMult > 1 ? " (serments ×" + r.oathMult + ")" : "");
    if (r.levelUps?.length) msg += " · " + r.levelUps.map((l: LevelUp) => l.name + " Niv." + l.level + " !").join(" · ");
    if (r.objective) msg += r.objective.justCompleted ? " · 🎯 Objectif accompli : " + r.objective.title + " !" : " · 🎯 " + r.objective.title + " " + r.objective.progress + "/" + r.objective.target;
    msg += almanaxMsg(r.almanax);
    flash(msg); load();
  }

  async function toggleWeekly(weeklyId: string, index: number) {
    const r = await fetch("/api/weeklies/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weeklyId, index }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    if (r.rewarded) {
      celebrate(r);
      let msg = "★ Mission hebdo accomplie ! +" + r.gained + " XP";
      if (r.levelUps?.length) msg += " · " + r.levelUps.map((l: LevelUp) => l.name + " Niv." + l.level).join(" · ");
      msg += almanaxMsg(r.almanax);
      flash(msg, 6000);
    } else if (r.almanax) flash("❖ Offrande accomplie : " + r.almanax.title + " (+" + r.almanax.mereons + " ❖)");
    load();
  }

  async function claimAlmanax() {
    const r = await fetch("/api/almanax", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim" }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3500); return; }
    playObjective();
    flash("❖ Offrande accomplie : +" + r.reward.mereons + " Méréons, +" + r.reward.gold + " or");
    load();
  }

  async function sealOaths() {
    if (!oathPick.length) return;
    const r = await fetch("/api/oaths", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys: oathPick }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    playLevelUp();
    flash("⚔️ Serments scellés. Le Système t'observe.");
    setOathPick([]); load();
  }

  async function clearGate() {
    if (!gate) return;
    const r = await fetch("/api/gates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: gate.id }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    celebrate(r);
    flash("⛩ Porte franchie ! +" + r.gained + " XP, +" + r.goldGain + " or", 6000);
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement des quêtes…</p>;
  const mandatory = quests.filter((q) => q.isMandatory && q.type !== "rankup");
  const normal = quests.filter((q) => !q.isMandatory && q.type !== "rankup");
  const themeAttr = ATTRIBUTES.find((x) => x.code === dayThemeCode);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 w-max max-w-[92vw] -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-center text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      {floatXp && <div className="pointer-events-none fixed left-1/2 top-24 z-[60] anim-float text-2xl font-bold text-emerald-300 system-glow">{floatXp}</div>}
      {burst && <div className="pointer-events-none fixed left-1/2 top-1/2 z-[60] anim-levelup text-3xl font-black uppercase tracking-[0.25em] text-system-accent system-glow">{burst}</div>}
      {drop && <LootCard drop={drop} onClose={() => setDrop(null)} />}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Quêtes — {day}</h1>

      {/* Bandeau Almanax : bonus du jour + offrande + Méréons */}
      {almanax && (
        <div className="anim-pop rounded-md border border-amber-400/40 bg-amber-400/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300">☀ Almanax du jour</p>
              <p className="mt-1 text-sm">
                {themeAttr && <span className="mr-2">Thème : <span style={{ color: themeAttr.color }}>{themeAttr.icon} {themeAttr.name}</span></span>}
                <span className={almanax.offering.done ? "text-emerald-400" : ""}>{almanax.offering.done ? "✓ " : "✦ "}{almanax.offering.title} — <span className="text-system-text/70">{almanax.offering.desc}</span> <span className="text-amber-300">(+{almanax.offering.mereons} ❖)</span></span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-amber-300">❖ {almanax.mereons}</span>
              {!almanax.offering.done && <button onClick={claimAlmanax} className="rounded border border-amber-400/60 px-3 py-1 text-xs uppercase tracking-widest text-amber-300 hover:bg-amber-400/10">Valider l&apos;offrande</button>}
            </div>
          </div>
        </div>
      )}

      {/* Porte du jour */}
      {gate && gate.status === "open" && (
        <div className="anim-pop rounded-md border p-3" style={{ borderColor: gate.color, boxShadow: "0 0 18px " + gate.color + "44" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: gate.color }}>⛩ Une Porte de rang {gate.rank} s&apos;est ouverte</p>
              <p className="mt-1 text-sm font-bold">{gate.title}</p>
              <p className="text-xs text-system-text/50">Elle se referme ce soir · +{gate.xp} XP · +{gate.gold} or</p>
            </div>
            <button onClick={clearGate} className="rounded border px-3 py-2 text-xs uppercase tracking-widest hover:bg-white/5" style={{ borderColor: gate.color, color: gate.color }}>Franchir la Porte</button>
          </div>
        </div>
      )}
      {gate && gate.status === "cleared" && (
        <p className="text-xs text-emerald-400">⛩ Porte du jour franchie. Le Système est satisfait.</p>
      )}

      {/* Serments du matin */}
      {oaths && (
        <div className="rounded-md border border-system-border/40 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-system-accent">⚔️ Serments du jour</p>
          {oaths.locked ? (
            <p className="mt-1 text-sm">
              {oaths.active.map((k) => { const o = oaths.catalog.find((x) => x.key === k); return o ? <span key={k} className="mr-3">{o.icon} {o.name} <span className="text-xs text-emerald-400">×{o.xpMult} XP</span></span> : null; })}
              <span className="text-xs text-system-text/50">— scellés jusqu&apos;à demain. Tiens-les, ou le Système punira.</span>
            </p>
          ) : (
            <div className="mt-2">
              <p className="mb-2 text-xs text-system-text/60">Impose-toi une contrainte, multiplie tes gains du jour. Rompre un serment coûte des PV et de l&apos;or. Max {oaths.max}.</p>
              <div className="flex flex-wrap gap-2">
                {oaths.catalog.map((o) => {
                  const on = oathPick.includes(o.key);
                  return (
                    <button key={o.key} onClick={() => setOathPick(on ? oathPick.filter((x) => x !== o.key) : oathPick.length < oaths.max ? [...oathPick, o.key] : oathPick)} className={"rounded border px-3 py-2 text-left text-xs " + (on ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/70 hover:border-system-accent/60")}>
                      <span className="font-bold">{o.icon} {o.name}</span> ×{o.xpMult} XP<br />
                      <span className="text-system-text/50">{o.desc}</span>
                    </button>
                  );
                })}
              </div>
              {oathPick.length > 0 && <button onClick={sealOaths} className="mt-2 rounded border border-system-accent px-4 py-1.5 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Sceller {oathPick.length} serment{oathPick.length > 1 ? "s" : ""}</button>}
            </div>
          )}
        </div>
      )}

      <div className="cards">
        <SystemPanel title="[ Missions hebdomadaires ]">
          {weeklies.length === 0 && <p className="text-sm text-system-text/60">Aucune mission cette semaine. Crée-en dans ⚙ Configuration.</p>}
          {weeklies.map((w) => {
            const done = w.steps.filter((s) => s.done).length;
            const pct = w.steps.length ? Math.round((done / w.steps.length) * 100) : 0;
            const finished = w.status === "done";
            return (
              <div key={w.id} className="mb-3 rounded border border-system-border/30 bg-black/20 p-3 last:mb-0">
                <div>
                  <p className="text-sm font-bold">{w.title} {finished && <span className="text-emerald-400">✓ accomplie</span>}</p>
                  <p className="text-xs text-system-text/50">{done}/{w.steps.length} · {w.baseXp} XP + or + loot garanti{w.attributeCodes.length ? " · " + w.attributeCodes.join(" ") : ""}</p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: pct + "%", backgroundColor: finished ? "#48e6a0" : "#ffcf4d" }} /></div>
                <ul className={"mt-2 space-y-1 " + (finished ? "opacity-50" : "")}>
                  {w.steps.map((s, i) => (
                    <li key={i}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={s.done} disabled={finished} onChange={() => toggleWeekly(w.id, i)} />
                        <span className={s.done ? "line-through opacity-50" : ""}>{s.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </SystemPanel>

        {mandatory.length > 0 && <SystemPanel title="[ Quête obligatoire du Système ]">{mandatory.map((q) => <Row key={q.id} q={q} onDone={complete} />)}</SystemPanel>}

        <SystemPanel title="[ Quêtes journalières ]">
          {normal.length === 0 ? <p className="text-sm text-system-text/60">Aucune quête. Crée-en dans ⚙ Configuration.</p> : normal.map((q) => <Row key={q.id} q={q} onDone={complete} />)}
        </SystemPanel>
      </div>
    </div>
  );
}

function Row({ q, onDone }: { q: Quest; onDone: (id: string) => void }) {
  const isAuto = q.type === "auto" && q.metricKey && typeof q.threshold === "number";
  const def = isAuto ? METRIC_BY_KEY[q.metricKey as string] : null;
  const val = q.todayValue ?? 0;
  const pct = isAuto ? Math.min(100, Math.round((val / (q.threshold as number)) * 100)) : 0;
  return (
    <div className={"border-b border-system-border/20 py-3 last:border-0 " + (q.done ? "opacity-50" : "")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm">{q.title} {isAuto && <span className="rounded border border-system-accent/50 px-1 text-[10px] uppercase tracking-widest text-system-accent">auto</span>}</p>
          <p className="text-xs text-system-text/50">{q.attributeCodes.join(" · ")}{q.attributeCodes.length ? " · " : ""}diff. {q.difficulty} · {q.baseXp} XP</p>
          {isAuto && !q.done && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 max-w-[180px] flex-1 overflow-hidden rounded bg-black/40"><div className="h-full bg-system-accent" style={{ width: pct + "%" }} /></div>
              <span className="text-[11px] text-system-text/60">{def?.icon} {Math.round(val)}/{Math.round(q.threshold as number)} {def?.unit}</span>
            </div>
          )}
        </div>
        {isAuto ? (
          <span className="shrink-0 text-xs uppercase tracking-widest text-system-text/50">{q.done ? "✓ Détecté" : "Le Système observe…"}</span>
        ) : (
          <button disabled={q.done} onClick={() => onDone(q.id)} className="shrink-0 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:cursor-not-allowed disabled:opacity-40">{q.done ? "Fait" : "Compléter"}</button>
        )}
      </div>
    </div>
  );
}
