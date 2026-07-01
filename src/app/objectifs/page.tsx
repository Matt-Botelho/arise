"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { ATTRIBUTES } from "@/lib/game.config";
import { SUGGESTIONS } from "@/lib/suggestions";

type Q = { id: string; title: string; baseXp: number; difficulty: string };
type Obj = { id: string; attributeCode: string; horizon: string; title: string; status: string; progress: number; targetCount: number; quests: Q[] };

const NAME: Record<string, string> = Object.fromEntries(ATTRIBUTES.map((a) => [a.code, a.icon + " " + a.name]));

export default function ObjectifsPage() {
  const [objs, setObjs] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [code, setCode] = useState(ATTRIBUTES[0].code);
  const [horizon, setHorizon] = useState("court");
  const [target, setTargetVal] = useState(10);
  const [title, setTitle] = useState("");
  const [openAdd, setOpenAdd] = useState<string | null>(null);
  const [customQ, setCustomQ] = useState("");

  async function load() {
    const r = await fetch("/api/objectives").then((res) => res.json());
    setObjs(r.objectives || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  async function createObj() {
    if (!title.trim()) return;
    const r = await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attributeCode: code, horizon, title, targetCount: target }) }).then((res) => res.json());
    if (r.ok) { setTitle(""); setTargetVal(10); load(); } else flash(r.error || "Erreur");
  }
  async function delObj(id: string) { await fetch("/api/objectives", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }
  async function toggleDone(o: Obj) { await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, status: o.status === "done" ? "active" : "done" }) }); load(); }
  async function setTarget(o: Obj, n: number) { if (n < 1) return; await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, targetCount: n }) }); load(); }
  async function addQuest(o: Obj, t: { title: string; baseXp?: number; difficulty?: string }) {
    await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t.title, attributeCodes: [o.attributeCode], baseXp: t.baseXp || 50, difficulty: t.difficulty || "E", objectiveId: o.id }) });
    setCustomQ(""); load();
  }
  async function delQuest(id: string) { await fetch("/api/quests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const byCode: Record<string, Obj[]> = {};
  for (const o of objs) (byCode[o.attributeCode] ||= []).push(o);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <div className="flex items-center justify-between">
        <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Objectifs</h1>
        <a href="/onboarding" className="text-xs uppercase tracking-widest text-system-accent hover:underline">Onboarding →</a>
      </div>

      <div className="cards">
      <SystemPanel title="[ Nouvel objectif ]">
        <div className="flex flex-wrap gap-2">
          <select className="rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={code} onChange={(e) => setCode(e.target.value)}>
            {ATTRIBUTES.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
          </select>
          <select className="rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
            <option value="court">Court terme</option>
            <option value="moyen">Moyen terme</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-system-text/60">Cible <input type="number" min={1} className="w-16 rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={target} onChange={(e) => setTargetVal(Math.max(1, parseInt(e.target.value || "1", 10)))} /> validations</label>
        </div>
        <input className="mt-2 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Intitulé de l'objectif" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button onClick={createObj} className="mt-2 w-full rounded border border-system-border px-3 py-2 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Ajouter l'objectif</button>
      </SystemPanel>

      {objs.length === 0 && <SystemPanel><p className="text-sm text-system-text/60">Aucun objectif. Lance l'<a href="/onboarding" className="text-system-accent underline">onboarding</a> ou crée-en un ci-dessus.</p></SystemPanel>}

      {ATTRIBUTES.filter((a) => byCode[a.code]?.length).map((a) => (
        <SystemPanel key={a.code} title={"[ " + NAME[a.code] + " ]"}>
          {byCode[a.code].map((o) => {
            const sug = SUGGESTIONS[a.code] || [];
            return (
              <div key={o.id} className="mb-3 rounded border border-system-border/30 bg-black/20 p-3 last:mb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={"text-sm font-bold " + (o.status === "done" ? "text-emerald-400 line-through" : "")}>{o.title}</p>
                    <p className="text-[11px] text-system-text/50">{o.horizon === "moyen" ? "Moyen terme" : "Court terme"} · {o.quests.length} quête(s)</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => toggleDone(o)} title="Marquer accompli" className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10">✓</button>
                    <button onClick={() => delObj(o.id)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">✕</button>
                  </div>
                </div>
                {(() => {
                  const tgt = o.targetCount || 10;
                  const pct = Math.min(100, Math.round((o.progress / tgt) * 100));
                  const reached = o.progress >= tgt;
                  return (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px] text-system-text/50">
                        <span>{reached ? "🎉 Atteint" : "Progression"} : {o.progress}/{tgt} validations</span>
                        <span className="flex items-center gap-1">
                          <button onClick={() => setTarget(o, tgt - 1)} className="rounded border border-system-border/40 px-1.5 leading-none hover:border-system-accent hover:text-system-accent">−</button>
                          <button onClick={() => setTarget(o, tgt + 1)} className="rounded border border-system-border/40 px-1.5 leading-none hover:border-system-accent hover:text-system-accent">+</button>
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40">
                        <div className={"h-full " + (reached ? "bg-emerald-400" : "bg-system-accent")} style={{ width: pct + "%" }} />
                      </div>
                    </div>
                  );
                })()}
                {o.quests.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {o.quests.map((q) => (
                      <li key={q.id} className="flex items-center justify-between text-sm">
                        <span>• {q.title} <span className="text-[11px] text-system-text/40">· {q.baseXp} XP</span></span>
                        <button onClick={() => delQuest(q.id)} className="text-xs text-red-400/70 hover:text-red-400">retirer</button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => setOpenAdd(openAdd === o.id ? null : o.id)} className="mt-2 text-xs uppercase tracking-widest text-system-accent hover:underline">+ quête liée</button>
                {openAdd === o.id && (
                  <div className="mt-2 rounded border border-system-border/20 p-2">
                    <div className="flex flex-wrap gap-1">
                      {sug.map((t, i) => <button key={i} onClick={() => addQuest(o, t)} className="rounded border border-system-border/40 px-2 py-1 text-[11px] text-system-text/70 hover:border-system-accent hover:text-system-accent">+ {t.title}</button>)}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input className="flex-1 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" placeholder="Quête personnalisée" value={customQ} onChange={(e) => setCustomQ(e.target.value)} />
                      <button onClick={() => customQ.trim() && addQuest(o, { title: customQ.trim() })} className="rounded border border-system-border px-2 py-1 text-xs text-system-accent">Ajouter</button>
                    </div>
                  </div>
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
