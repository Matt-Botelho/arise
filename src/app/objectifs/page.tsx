"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { ATTRIBUTES } from "@/lib/game.config";

type Q = { id: string; title: string; baseXp: number; difficulty: string };
type Obj = { id: string; attributeCode: string; horizon: string; title: string; status: string; progress: number; targetCount: number; quests: Q[] };

const NAME: Record<string, string> = Object.fromEntries(ATTRIBUTES.map((a) => [a.code, a.icon + " " + a.name]));

export default function ObjectifsPage() {
  const [objs, setObjs] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/objectives").then((res) => res.json());
    setObjs(r.objectives || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const byCode: Record<string, Obj[]> = {};
  for (const o of objs) (byCode[o.attributeCode] ||= []).push(o);

  return (
    <div className="space-y-4">
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Objectifs</h1>

      {objs.length === 0 && <SystemPanel><p className="text-sm text-system-text/60">Aucun objectif. Définis-les dans l'onglet ⚙ Configuration (ou via l'onboarding).</p></SystemPanel>}

      <div className="cards">
        {ATTRIBUTES.filter((a) => byCode[a.code]?.length).map((a) => (
          <SystemPanel key={a.code} title={"[ " + NAME[a.code] + " ]"}>
            {byCode[a.code].map((o) => {
              const tgt = o.targetCount || 10;
              const pct = Math.min(100, Math.round((o.progress / tgt) * 100));
              const reached = o.progress >= tgt;
              return (
                <div key={o.id} className="mb-3 rounded border border-system-border/30 bg-black/20 p-3 last:mb-0">
                  <p className={"text-sm font-bold " + (o.status === "done" || reached ? "text-emerald-400" : "")}>{o.title}{(o.status === "done" || reached) ? " ✓" : ""}</p>
                  <p className="text-xs text-system-text/50">{o.horizon === "moyen" ? "Moyen terme" : "Court terme"} · {o.quests.length} quête(s) liée(s)</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-system-text/50"><span>{reached ? "🎉 Atteint" : "Progression"}</span><span>{o.progress}/{tgt}</span></div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className={"h-full " + (reached ? "bg-emerald-400" : "bg-system-accent")} style={{ width: pct + "%" }} /></div>
                  {o.quests.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {o.quests.map((q) => <li key={q.id} className="text-system-text/70">• {q.title} <span className="text-xs text-system-text/40">· {q.baseXp} XP</span></li>)}
                    </ul>
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
