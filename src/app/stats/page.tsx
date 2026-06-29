"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";

type Pt = { day: string; xp: number; done: number; failed: number };
type Attr = { code: string; name: string; color: string; level: number };
type Ach = { key: string; name: string; description: string; icon: string; unlocked: boolean };

export default function StatsPage() {
  const [series, setSeries] = useState<Pt[]>([]);
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [achs, setAchs] = useState<Ach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/history").then((r) => r.json()),
      fetch("/api/achievements").then((r) => r.json()),
    ]).then(([h, a]) => {
      setSeries(h.series || []);
      setAttrs(h.attributes || []);
      setAchs(a.achievements || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  const maxXp = Math.max(1, ...series.map((s) => s.xp));
  const maxLvl = Math.max(1, ...attrs.map((a) => a.level));
  const totalDone = series.reduce((s, p) => s + p.done, 0);
  const totalXp = series.reduce((s, p) => s + p.xp, 0);
  const unlocked = achs.filter((a) => a.unlocked).length;
  const n = Math.max(1, series.length);

  return (
    <div className="space-y-4">
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Stats</h1>

      <SystemPanel title="[ XP par jour (30 j) ]">
        <svg viewBox="0 0 300 80" className="w-full" preserveAspectRatio="none">
          {series.map((s, i) => {
            const w = 300 / n;
            const h = Math.round((s.xp / maxXp) * 70);
            return <rect key={i} x={i * w + 0.5} y={78 - h} width={Math.max(1, w - 1)} height={h} fill="#38e1ff" opacity={s.xp > 0 ? 0.9 : 0.15} />;
          })}
        </svg>
        <p className="mt-2 text-xs text-system-text/60">{totalDone} quêtes complétées · {totalXp} XP sur 30 jours</p>
      </SystemPanel>

      <SystemPanel title="[ Niveaux d'attributs ]">
        <div className="space-y-2">
          {attrs.map((a) => (
            <div key={a.code}>
              <div className="flex justify-between text-xs"><span>{a.name}</span><span style={{ color: a.color }}>Niv. {a.level}</span></div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: Math.round((a.level / maxLvl) * 100) + "%", backgroundColor: a.color }} /></div>
            </div>
          ))}
        </div>
      </SystemPanel>

      <SystemPanel title={"[ Succès · " + unlocked + "/" + achs.length + " ]"}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {achs.map((a) => (
            <div key={a.key} className={"rounded border p-2 text-center " + (a.unlocked ? "border-system-accent/60 bg-black/20" : "border-system-border/20 opacity-40")}>
              <div className="text-2xl">{a.icon}</div>
              <div className="mt-1 text-[11px] font-bold">{a.name}</div>
              <div className="text-[10px] text-system-text/50">{a.description}</div>
            </div>
          ))}
        </div>
      </SystemPanel>
    </div>
  );
}
