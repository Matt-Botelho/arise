"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { RARITY_LABEL, type Rarity } from "@/lib/lpc-items";
import { ATTRIBUTES } from "@/lib/game.config";
import { setSfxEnabled, playXp, playLevelUp, playLoot, playObjective } from "@/lib/sfx";

type Quest = { id: string; title: string; type: string; attributeCodes: string[]; baseXp: number; difficulty: string; isMandatory: boolean; done: boolean };
type Step = { label: string; done: boolean };
type Weekly = { id: string; title: string; description: string; steps: Step[]; attributeCodes: string[]; baseXp: number; status: string };
type LevelUp = { name: string; level: number };

const CODES = ["FOR", "VIT", "INT", "VOL", "FIN", "FAM", "TRA", "JAR", "ART"];

export default function QuetesPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [weeklies, setWeeklies] = useState<Weekly[]>([]);
  const [day, setDay] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [burst, setBurst] = useState<string | null>(null);
  const [floatXp, setFloatXp] = useState<string | null>(null);
  const [dayThemeCode, setDayThemeCode] = useState("");
  // form hebdo
  const [wTitle, setWTitle] = useState("");
  const [wSteps, setWSteps] = useState("");
  const [wXp, setWXp] = useState(400);
  const [wCodes, setWCodes] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [q, w] = await Promise.all([
      fetch("/api/quests").then((r) => r.json()),
      fetch("/api/weeklies").then((r) => r.json()),
    ]);
    setQuests(q.quests || []); setDay(q.day || "");
    setDayThemeCode(q.dayThemeCode || "");
    setSfxEnabled(q.sfxEnabled !== false);
    setWeeklies(w.weeklies || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string, ms = 5000) { setToast(m); setTimeout(() => setToast(null), ms); }
  function celebrate(r: { gained?: number; globalLeveledUp?: boolean; globalLevel?: number; levelUps?: LevelUp[]; drop?: { rarity: string } | null; objective?: { justCompleted?: boolean } | null }) {
    if (typeof r.gained === "number") { setFloatXp("+" + r.gained + " XP"); setTimeout(() => setFloatXp(null), 1100); }
    const leveled = !!r.globalLeveledUp || !!(r.levelUps && r.levelUps.length);
    if (leveled) { playLevelUp(); setBurst(r.globalLeveledUp && r.globalLevel ? "NIVEAU " + r.globalLevel : "NIVEAU SUPÉRIEUR"); setTimeout(() => setBurst(null), 1400); }
    else { playXp(); }
    if (r.drop) playLoot(r.drop.rarity);
    if (r.objective?.justCompleted) playObjective();
  }

  async function complete(id: string) {
    const r = await fetch("/api/quests/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: id }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    celebrate(r);
    let msg = "+" + r.gained + " XP";
    if (r.levelUps?.length) msg += " · " + r.levelUps.map((l: LevelUp) => l.name + " Niv." + l.level + " !").join(" · ");
    if (r.drop) msg += " · ✦ Butin : " + r.drop.name + " (" + (RARITY_LABEL[r.drop.rarity as Rarity] || r.drop.rarity) + ")";
    if (r.objective) msg += r.objective.justCompleted ? " · 🎯 Objectif accompli : " + r.objective.title + " !" : " · 🎯 " + r.objective.title + " " + r.objective.progress + "/" + r.objective.target;
    flash(msg); load();
  }

  async function toggleWeekly(weeklyId: string, index: number) {
    const r = await fetch("/api/weeklies/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weeklyId, index }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    if (r.rewarded) {
      celebrate(r);
      let msg = "★ Mission hebdo accomplie ! +" + r.gained + " XP";
      if (r.levelUps?.length) msg += " · " + r.levelUps.map((l: LevelUp) => l.name + " Niv." + l.level).join(" · ");
      if (r.drop) msg += " · ✦ Butin : " + r.drop.name + " (" + (RARITY_LABEL[r.drop.rarity as Rarity] || r.drop.rarity) + ")";
      flash(msg, 6000);
    }
    load();
  }

  async function createWeekly() {
    if (!wTitle.trim()) return;
    const steps = wSteps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) { flash("Ajoute au moins une étape.", 3000); return; }
    const r = await fetch("/api/weeklies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: wTitle, steps, attributeCodes: wCodes, baseXp: wXp }) }).then((res) => res.json());
    if (r.ok) { setWTitle(""); setWSteps(""); setWXp(400); setWCodes([]); setShowForm(false); load(); } else flash(r.error || "Erreur", 3000);
  }
  async function delWeekly(id: string) {
    await fetch("/api/weeklies", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  function toggleCode(c: string) { setWCodes((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])); }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement des quêtes…</p>;
  const mandatory = quests.filter((q) => q.isMandatory && q.type !== "rankup");
  const normal = quests.filter((q) => !q.isMandatory && q.type !== "rankup");

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-center text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      {floatXp && <div className="pointer-events-none fixed left-1/2 top-24 z-[60] anim-float text-2xl font-bold text-emerald-300 system-glow">{floatXp}</div>}
      {burst && <div className="pointer-events-none fixed left-1/2 top-1/2 z-[60] anim-levelup text-3xl font-black uppercase tracking-[0.25em] text-system-accent system-glow">{burst}</div>}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Quêtes — {day}</h1>
      {dayThemeCode && (() => { const a = ATTRIBUTES.find((x) => x.code === dayThemeCode); return a ? <p className="text-xs text-system-text/60">Thème du jour : <span style={{ color: a.color }}>{a.icon} {a.name}</span> — privilégie une quête {a.name} pour la quête obligatoire.</p> : null; })()}

      <SystemPanel title="[ Missions hebdomadaires ]">
        {weeklies.length === 0 && <p className="text-sm text-system-text/60">Aucune mission cette semaine.</p>}
        {weeklies.map((w) => {
          const done = w.steps.filter((s) => s.done).length;
          const pct = w.steps.length ? Math.round((done / w.steps.length) * 100) : 0;
          const finished = w.status === "done";
          return (
            <div key={w.id} className="mb-3 rounded border border-system-border/30 bg-black/20 p-3 last:mb-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{w.title} {finished && <span className="text-emerald-400">✓ accomplie</span>}</p>
                  <p className="text-[11px] text-system-text/50">{done}/{w.steps.length} · {w.baseXp} XP + or + loot garanti{w.attributeCodes.length ? " · " + w.attributeCodes.join(" ") : ""}</p>
                </div>
                <button onClick={() => delWeekly(w.id)} className="shrink-0 rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">✕</button>
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
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="mt-1 w-full rounded border border-system-border/50 px-3 py-2 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">+ Nouvelle mission hebdo</button>
        ) : (
          <div className="mt-2 border-t border-system-border/20 pt-3">
            <input className="w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Titre (ex. 4 séances de sport cette semaine)" value={wTitle} onChange={(e) => setWTitle(e.target.value)} />
            <textarea className="mt-2 h-20 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder={"Séance 1\nSéance 2\nSéance 3\nSéance 4"} value={wSteps} onChange={(e) => setWSteps(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-2">
              {CODES.map((c) => <button key={c} onClick={() => toggleCode(c)} className={"rounded border px-2 py-1 text-xs " + (wCodes.includes(c) ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>{c}</button>)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-system-text/60">XP :</span>
              <input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none focus:border-system-accent" value={wXp} onChange={(e) => setWXp(parseInt(e.target.value || "1", 10))} />
              <button onClick={createWeekly} className="ml-auto rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Créer</button>
              <button onClick={() => setShowForm(false)} className="rounded border border-system-border/40 px-3 py-1 text-xs text-system-text/60">Annuler</button>
            </div>
          </div>
        )}
      </SystemPanel>

      {mandatory.length > 0 && <SystemPanel title="[ Quête obligatoire du Système ]">{mandatory.map((q) => <Row key={q.id} q={q} onDone={complete} />)}</SystemPanel>}
      <SystemPanel title="[ Quêtes journalières ]">
        {normal.length === 0 ? <p className="text-sm text-system-text/60">Aucune quête.</p> : normal.map((q) => <Row key={q.id} q={q} onDone={complete} />)}
      </SystemPanel>
    </div>
  );
}

function Row({ q, onDone }: { q: Quest; onDone: (id: string) => void }) {
  return (
    <div className={"flex items-center justify-between gap-3 border-b border-system-border/20 py-3 last:border-0 " + (q.done ? "opacity-50" : "")}>
      <div>
        <p className="text-sm">{q.title}</p>
        <p className="text-[11px] text-system-text/50">{q.attributeCodes.join(" · ")}{q.attributeCodes.length ? " · " : ""}diff. {q.difficulty} · {q.baseXp} XP</p>
      </div>
      <button disabled={q.done} onClick={() => onDone(q.id)} className="shrink-0 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:cursor-not-allowed disabled:opacity-40">{q.done ? "Fait" : "Compléter"}</button>
    </div>
  );
}
