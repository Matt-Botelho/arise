"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { playRankUp } from "@/lib/sfx";

type Step = { label: string; done: boolean };
type Dungeon = { id: string; title: string; description: string; rank: string; steps: Step[]; attributeCodes: string[]; rewardXp: number; status: string; isRankUp: boolean; targetRank: string | null };
type LevelUp = { code: string; name: string; level: number };
type HunterInfo = { rank: string; nextRank: string | null; globalLevel: number; ceiling: number; attrThreshold: number; minAttrLevel: number; rankUpReady: boolean; levelReady: boolean; attrsReady: boolean };

export default function DonjonsPage() {
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [h, setH] = useState<HunterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const [r, s] = await Promise.all([
      fetch("/api/dungeons").then((res) => res.json()),
      fetch("/api/status").then((res) => res.json()),
    ]);
    setDungeons(r.dungeons || []);
    if (!s.error) setH({ rank: s.hunter.rank, nextRank: s.hunter.nextRank, globalLevel: s.hunter.globalLevel, ceiling: s.hunter.ceiling, attrThreshold: s.hunter.attrThreshold, minAttrLevel: s.hunter.minAttrLevel, rankUpReady: s.hunter.rankUpAvailable, levelReady: s.hunter.levelReady, attrsReady: s.hunter.attrsReady });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 4000); }

  const canRankUp = h ? h.rankUpReady : false;
  function locked(d: Dungeon) { return d.isRankUp && !canRankUp; }

  async function toggle(d: Dungeon, index: number) {
    if (locked(d)) { flash(h && !h.levelReady ? "🔒 Atteins le niveau " + h.ceiling + " de ton rang." : "🔒 Monte chaque attribut au niveau " + (h?.attrThreshold ?? "") + " (le plus bas est à " + (h?.minAttrLevel ?? "") + ")."); return; }
    const r = await fetch("/api/dungeons/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dungeonId: d.id, index }) }).then((res) => res.json());
    if (r.error) { flash(r.error); return; }
    if (r.rankedUp) { playRankUp(); flash("⩘ RANG " + r.rankedUp.to + " ATTEINT ! Palier débloqué."); }
    else if (r.cleared) {
      const lv = (r.levelUps as LevelUp[] | undefined)?.map((l) => l.name + " Niv." + l.level).join(" · ");
      flash("🏰 Donjon vaincu !" + (lv ? " " + lv : ""));
    }
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const rankUps = dungeons.filter((d) => d.isRankUp);
  const frees = dungeons.filter((d) => !d.isRankUp);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Donjons</h1>

      <div className="cards">
        {h && (
          <SystemPanel title="[ Conditions de passage de rang ]">
            <p className="text-xs text-system-text/70">Rang <span className="text-system-accent">{h.rank}</span>{h.nextRank ? " → " + h.nextRank : " (max)"}. Pour débloquer le Donjon de Changement de Rang :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className={h.levelReady ? "text-emerald-400" : "text-system-text/70"}>{h.levelReady ? "✓" : "○"} Niveau global {h.ceiling} <span className="text-xs text-system-text/40">(actuel {h.globalLevel})</span></li>
              <li className={h.attrsReady ? "text-emerald-400" : "text-system-text/70"}>{h.attrsReady ? "✓" : "○"} Chaque attribut au niveau {h.attrThreshold} <span className="text-xs text-system-text/40">(plus bas : {h.minAttrLevel})</span></li>
            </ul>
            {canRankUp && <p className="mt-2 text-amber-300">Toutes les conditions réunies — le donjon de rang est déverrouillé. 🔓</p>}
          </SystemPanel>
        )}
        {rankUps.map((d) => <DungeonCard key={d.id} d={d} locked={locked(d)} onToggle={toggle} />)}
        {frees.map((d) => <DungeonCard key={d.id} d={d} locked={false} onToggle={toggle} />)}
        {dungeons.length === 0 && <SystemPanel><p className="text-sm text-system-text/60">Aucun donjon. Crée tes épreuves dans l'onglet ⚙ Configuration.</p></SystemPanel>}
      </div>
    </div>
  );
}

function DungeonCard({ d, locked, onToggle }: { d: Dungeon; locked: boolean; onToggle: (d: Dungeon, i: number) => void }) {
  const done = d.steps.filter((s) => s.done).length;
  const pct = d.steps.length ? Math.round((done / d.steps.length) * 100) : 0;
  const title = d.isRankUp ? "[ Passage de rang" + (d.targetRank ? " → " + d.targetRank : "") + (locked ? " 🔒" : " 🔓") + " ]" : "[ Donjon · Rang " + d.rank + " ]";
  return (
    <SystemPanel title={title}>
      <div>
        <p className="text-sm font-bold">{d.title} {d.status === "cleared" && <span className="text-emerald-400">✓ vaincu</span>}</p>
        <p className="text-xs text-system-text/50">{done}/{d.steps.length} étapes · {d.rewardXp} or{d.attributeCodes.length ? " · " + d.attributeCodes.join(" ") : ""}</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: pct + "%", backgroundColor: locked ? "#5a6b7a" : "#38e1ff" }} /></div>
      {locked && <p className="mt-2 text-xs text-amber-300/80">🔒 Verrouillé jusqu'au niveau max de ton rang.</p>}
      <ul className={"mt-3 space-y-1 " + (locked ? "opacity-50" : "")}>
        {d.steps.map((s, i) => (
          <li key={i}>
            <label className={"flex items-center gap-2 text-sm " + (locked ? "cursor-not-allowed" : "cursor-pointer")}>
              <input type="checkbox" checked={s.done} disabled={locked} onChange={() => onToggle(d, i)} />
              <span className={s.done ? "line-through opacity-50" : ""}>{s.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </SystemPanel>
  );
}
