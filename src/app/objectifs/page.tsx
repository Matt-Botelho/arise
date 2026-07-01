"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { ATTRIBUTES } from "@/lib/game.config";

type Q = { id: string; title: string; baseXp: number; difficulty: string };
type Obj = { id: string; attributeCode: string; horizon: string; title: string; status: string; progress: number; targetCount: number; kind: string; metricUnit: string | null; startValue: number | null; targetValue: number | null; currentValue: number | null; quests: Q[] };

const NAME: Record<string, string> = Object.fromEntries(ATTRIBUTES.map((a) => [a.code, a.icon + " " + a.name]));

function metricFrac(start: number, target: number, current: number): number {
  if (target === start) return current >= target ? 1 : 0;
  return Math.max(0, Math.min(1, (current - start) / (target - start)));
}

export default function ObjectifsPage() {
  const [objs, setObjs] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/objectives").then((res) => res.json());
    setObjs(r.objectives || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  async function updateMetric(o: Obj) {
    const raw = draft[o.id];
    if (raw === undefined || raw === "") return;
    const val = parseFloat(raw);
    if (Number.isNaN(val)) return;
    const reached = metricFrac(o.startValue ?? 0, o.targetValue ?? 0, val) >= 1;
    await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, currentValue: val, ...(reached ? { status: "done" } : {}) }) });
    setDraft((d) => ({ ...d, [o.id]: "" }));
    flash(reached ? "🎯 Objectif atteint !" : "Mis à jour");
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const byCode: Record<string, Obj[]> = {};
  for (const o of objs) (byCode[o.attributeCode] ||= []).push(o);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Objectifs</h1>

      {objs.length === 0 && <SystemPanel><p className="text-sm text-system-text/60">Aucun objectif. Définis-les dans l'onglet ⚙ Configuration (essaie l'✨ Assistant !) ou via l'onboarding.</p></SystemPanel>}

      <div className="cards">
        {ATTRIBUTES.filter((a) => byCode[a.code]?.length).map((a) => (
          <SystemPanel key={a.code} title={"[ " + NAME[a.code] + " ]"}>
            {byCode[a.code].map((o) => {
              const metric = o.kind === "metric";
              const cur = o.currentValue ?? o.startValue ?? 0;
              const frac = metric ? metricFrac(o.startValue ?? 0, o.targetValue ?? 0, cur) : Math.min(1, (o.progress || 0) / (o.targetCount || 10));
              const pct = Math.round(frac * 100);
              const reached = o.status === "done" || frac >= 1;
              return (
                <div key={o.id} className="mb-3 rounded border border-system-border/30 bg-black/20 p-3 last:mb-0">
                  <p className={"text-sm font-bold " + (reached ? "text-emerald-400" : "")}>{o.title}{reached ? " ✓" : ""}</p>
                  <p className="text-xs text-system-text/50">{o.horizon === "moyen" ? "Moyen terme" : "Court terme"}{!metric ? " · " + o.quests.length + " quête(s) liée(s)" : ""}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-system-text/50">
                    <span>{reached ? "🎉 Atteint" : "Progression"}</span>
                    <span>{metric ? cur + " / " + (o.targetValue ?? 0) + " " + (o.metricUnit || "") : (o.progress || 0) + "/" + (o.targetCount || 10)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className={"h-full " + (reached ? "bg-emerald-400" : "bg-system-accent")} style={{ width: pct + "%" }} /></div>
                  {metric && !reached && (
                    <div className="mt-2 flex items-center gap-2">
                      <input type="number" className="w-28 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none focus:border-system-accent" placeholder={"Actuel (" + (o.metricUnit || "") + ")"} value={draft[o.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [o.id]: e.target.value }))} />
                      <button onClick={() => updateMetric(o)} className="rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Mettre à jour</button>
                    </div>
                  )}
                  {!metric && o.quests.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">{o.quests.map((q) => <li key={q.id} className="text-system-text/70">• {q.title} <span className="text-xs text-system-text/40">· {q.baseXp} XP</span></li>)}</ul>
                  )}
                </div>
              );
            })}
          </SystemPanel>
        ))}
      </div>
    </div>
  );
}
