"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { ATTRIBUTES } from "@/lib/game.config";
import { setSfxEnabled, playXp, playLevelUp } from "@/lib/sfx";

type St = { label: string; done: boolean };
type Q = { id: string; title: string; baseXp: number; difficulty: string };
type Obj = { id: string; parentId: string | null; attributeCode: string; horizon: string; title: string; status: string; kind: string; recurrence: string; steps: St[] | null; progress: number; targetCount: number; metricUnit: string | null; startValue: number | null; targetValue: number | null; currentValue: number | null; frac: number; done: boolean; quests: Q[] };

const NAME: Record<string, string> = Object.fromEntries(ATTRIBUTES.map((a) => [a.code, a.icon + " " + a.name]));
const COLOR: Record<string, string> = Object.fromEntries(ATTRIBUTES.map((a) => [a.code, a.color]));
const HZ: Record<string, { label: string; color: string }> = {
  long: { label: "Quête Principale", color: "#ffcf4d" },
  moyen: { label: "Chapitre", color: "#38e1ff" },
  court: { label: "Quête", color: "#9db6ce" },
};
const RECUR: Record<string, string> = { week: "Hebdo ↻", month: "Mensuel ⟳", once: "Checklist" };

function aggFrac(o: Obj, byParent: Record<string, Obj[]>): number {
  const kids = byParent[o.id] || [];
  if (kids.length) return kids.reduce((s, k) => s + aggFrac(k, byParent), 0) / kids.length;
  return o.frac;
}

export default function AventurePage() {
  const [objs, setObjs] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/objectives").then((res) => res.json());
    setObjs(r.objectives || []); setLoading(false);
  }
  useEffect(() => { setSfxEnabled(true); load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function toggleStep(id: string, index: number) {
    const r = await fetch("/api/objectives/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, index }) }).then((x) => x.json());
    if (r.gained > 0) { if (r.leveledUp || r.levelUps?.length) playLevelUp(); else playXp(); flash("+" + r.gained + " XP" + (r.levelUps?.length ? " · " + r.levelUps.map((l: { name: string; level: number }) => l.name + " Niv." + l.level).join(" · ") : "")); }
    load();
  }
  async function updateMetric(o: Obj) {
    const raw = draft[o.id]; if (raw === undefined || raw === "") return;
    const val = parseFloat(raw); if (Number.isNaN(val)) return;
    const start = o.startValue ?? 0, target = o.targetValue ?? 0;
    const reached = (target === start ? val >= target : Math.max(0, Math.min(1, (val - start) / (target - start))) >= 1);
    await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, currentValue: val, ...(reached ? { status: "done" } : {}) }) });
    setDraft((d) => ({ ...d, [o.id]: "" }));
    if (reached) playLevelUp();
    flash(reached ? "🎯 Objectif atteint !" : "Mis à jour"); load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement de l'aventure…</p>;
  const byParent: Record<string, Obj[]> = {};
  const roots: Obj[] = [];
  for (const o of objs) { if (o.parentId) (byParent[o.parentId] ||= []).push(o); else roots.push(o); }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Aventure</h1>
        <a href="/configuration" className="text-xs uppercase tracking-widest text-system-accent hover:underline">✨ Assistant / gérer →</a>
      </div>

      {roots.length === 0 && <SystemPanel><p className="text-sm text-system-text/60">Aucune quête. Lance l'✨ Assistant dans l'onglet ⚙ Configuration pour forger ta première Quête Principale.</p></SystemPanel>}

      <div className="cards">
        {roots.map((o) => (
          <QNode key={o.id} o={o} byParent={byParent} depth={0} collapsed={collapsed} setCollapsed={setCollapsed} draft={draft} setDraft={setDraft} onStep={toggleStep} onMetric={updateMetric} />
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ frac, done }: { frac: number; done: boolean }) {
  return <div className="mt-2 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: Math.round(frac * 100) + "%", backgroundColor: done ? "#48e6a0" : "#38e1ff" }} /></div>;
}

function QNode({ o, byParent, depth, collapsed, setCollapsed, draft, setDraft, onStep, onMetric }: {
  o: Obj; byParent: Record<string, Obj[]>; depth: number;
  collapsed: Record<string, boolean>; setCollapsed: (f: (c: Record<string, boolean>) => Record<string, boolean>) => void;
  draft: Record<string, string>; setDraft: (f: (d: Record<string, string>) => Record<string, string>) => void;
  onStep: (id: string, i: number) => void; onMetric: (o: Obj) => void;
}) {
  const kids = byParent[o.id] || [];
  const hz = HZ[o.horizon] || HZ.court;
  const frac = aggFrac(o, byParent);
  const done = o.done || (kids.length > 0 && frac >= 1);
  const isCol = collapsed[o.id];
  const accent = done ? "#48e6a0" : hz.color;

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-xs uppercase tracking-widest" style={{ color: accent }}>{hz.label}{o.attributeCode ? " · " + (NAME[o.attributeCode] || o.attributeCode) : ""}</div>
        <div className={"text-sm font-bold " + (done ? "text-emerald-400" : "text-system-text")}>{o.title}{done ? " ✓" : ""}</div>
      </div>
      {(kids.length > 0 || o.kind === "count") && <span className="shrink-0 text-xs text-system-text/50">{Math.round(frac * 100)}%</span>}
    </div>
  );

  const body = (
    <>
      {(kids.length > 0 || o.kind !== "checklist") && <ProgressBar frac={frac} done={done} />}

      {o.kind === "checklist" && o.steps && (
        <div className="mt-2">
          {o.recurrence !== "once" && <p className="mb-1 text-xs" style={{ color: "#48e6a0" }}>{RECUR[o.recurrence]} · se réinitialise chaque {o.recurrence === "week" ? "semaine" : "mois"}</p>}
          <ul className="space-y-1">
            {o.steps.map((s, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.done} onChange={() => onStep(o.id, i)} />
                  <span className={s.done ? "line-through opacity-50" : ""}>{s.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {o.kind === "metric" && !done && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-system-text/50">{(o.currentValue ?? o.startValue ?? 0)} / {o.targetValue ?? 0} {o.metricUnit || ""}</span>
          <input type="number" className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none focus:border-system-accent" placeholder="Actuel" value={draft[o.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [o.id]: e.target.value }))} />
          <button onClick={() => onMetric(o)} className="rounded border border-system-border px-2 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Màj</button>
        </div>
      )}
      {o.kind === "metric" && done && <p className="mt-1 text-xs text-emerald-400">{o.currentValue} {o.metricUnit} atteint 🎯</p>}

      {o.kind === "count" && o.quests.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-system-text/60">
          {o.quests.map((q) => <li key={q.id}>• {q.title} <span className="text-xs text-system-text/40">· à valider dans Quêtes</span></li>)}
        </ul>
      )}
      {o.kind === "count" && o.quests.length === 0 && <p className="mt-1 text-xs text-system-text/40">Aucune quête liée. Ajoute-en via ⚙ Configuration.</p>}

      {kids.length > 0 && !isCol && (
        <div className="mt-3 space-y-2 border-l border-system-border/30 pl-3">
          {kids.map((k) => (
            <QNode key={k.id} o={k} byParent={byParent} depth={depth + 1} collapsed={collapsed} setCollapsed={setCollapsed} draft={draft} setDraft={setDraft} onStep={onStep} onMetric={onMetric} />
          ))}
        </div>
      )}
      {kids.length > 0 && (
        <button onClick={() => setCollapsed((c) => ({ ...c, [o.id]: !c[o.id] }))} className="mt-2 text-xs uppercase tracking-widest text-system-accent/70 hover:underline">{isCol ? "▸ déplier " + kids.length + " étape(s)" : "▾ replier"}</button>
      )}
    </>
  );

  if (depth === 0) return <SystemPanel className={done ? "border-emerald-500/40" : ""}><div style={{ borderLeft: "3px solid " + accent, paddingLeft: 10 }}>{header}{body}</div></SystemPanel>;
  return <div className="rounded border border-system-border/25 bg-black/20 p-3">{header}{body}</div>;
}
