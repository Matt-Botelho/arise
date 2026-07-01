"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { playRankUp } from "@/lib/sfx";

type Step = { label: string; done: boolean };
type Dungeon = { id: string; title: string; description: string; rank: string; steps: Step[]; attributeCodes: string[]; rewardXp: number; status: string; isRankUp: boolean; targetRank: string | null };
type LevelUp = { code: string; name: string; level: number };
type HunterInfo = { rank: string; nextRank: string | null; globalLevel: number; ceiling: number };

const CODES = ["FOR", "VIT", "INT", "VOL", "FIN", "FAM", "TRA", "JAR", "ART"];

export default function DonjonsPage() {
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [h, setH] = useState<HunterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isRankUp, setIsRankUp] = useState(true);
  const [rank, setRank] = useState("D");
  const [stepsText, setStepsText] = useState("");
  const [rewardXp, setRewardXp] = useState(400);
  const [codes, setCodes] = useState<string[]>([]);

  async function load() {
    const [r, s] = await Promise.all([
      fetch("/api/dungeons").then((res) => res.json()),
      fetch("/api/status").then((res) => res.json()),
    ]);
    setDungeons(r.dungeons || []);
    if (!s.error) setH({ rank: s.hunter.rank, nextRank: s.hunter.nextRank, globalLevel: s.hunter.globalLevel, ceiling: s.hunter.ceiling });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 4000); }

  const atCeiling = h ? h.globalLevel >= h.ceiling : false;
  function locked(d: Dungeon) { return d.isRankUp && !atCeiling; }

  async function toggle(d: Dungeon, index: number) {
    if (locked(d)) { flash("🔒 Verrouillé — atteins le niveau " + (h?.ceiling ?? "max") + " de ton rang."); return; }
    const r = await fetch("/api/dungeons/step", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dungeonId: d.id, index }),
    }).then((res) => res.json());
    if (r.error) { flash(r.error); return; }
    if (r.rankedUp) { playRankUp(); flash("⩘ RANG " + r.rankedUp.to + " ATTEINT ! Palier débloqué."); }
    else if (r.cleared) {
      const lv = (r.levelUps as LevelUp[] | undefined)?.map((l) => l.name + " Niv." + l.level).join(" · ");
      flash("🏰 Donjon vaincu !" + (lv ? " " + lv : ""));
    }
    load();
  }

  async function create() {
    if (!title.trim()) return;
    const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) { flash("Ajoute au moins une étape."); return; }
    const r = await fetch("/api/dungeons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, steps, rewardXp, isRankUp, rank: isRankUp ? undefined : rank, attributeCodes: isRankUp ? [] : codes }),
    }).then((res) => res.json());
    if (r.ok) { setTitle(""); setStepsText(""); setRewardXp(400); setCodes([]); load(); } else flash(r.error || "Erreur");
  }

  async function del(id: string) {
    await fetch("/api/dungeons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  function toggleCode(c: string) { setCodes((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])); }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  const rankUps = dungeons.filter((d) => d.isRankUp);
  const frees = dungeons.filter((d) => !d.isRankUp);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Donjons</h1>

      <div className="cards">
      {h && (
        <SystemPanel>
          <p className="text-xs text-system-text/70">
            Rang <span className="text-system-accent">{h.rank}</span> · Niveau {h.globalLevel}/{h.ceiling}.{" "}
            {atCeiling
              ? <span className="text-amber-300">Plafond atteint — tes donjons de passage de rang sont déverrouillés. 🔓</span>
              : <span>Les donjons de passage de rang se débloqueront au niveau {h.ceiling}.</span>}
          </p>
        </SystemPanel>
      )}

      {rankUps.map((d) => <DungeonCard key={d.id} d={d} locked={locked(d)} onToggle={toggle} onDel={del} />)}
      {frees.map((d) => <DungeonCard key={d.id} d={d} locked={false} onToggle={toggle} onDel={del} />)}
      {dungeons.length === 0 && <SystemPanel><p className="text-sm text-system-text/60">Aucun donjon. Crée ta première épreuve ci-dessous.</p></SystemPanel>}

      <SystemPanel title="[ Nouveau donjon ]">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={isRankUp} onChange={(e) => setIsRankUp(e.target.checked)} />
          <span>Donjon de passage de rang{h?.nextRank ? " (" + h.rank + " → " + h.nextRank + ")" : ""}</span>
        </label>
        <p className="mt-1 text-[11px] text-system-text/40">{isRankUp ? "Verrouillé jusqu'au niveau max de ton rang ; le terminer te fait monter de rang." : "Objectif libre, cochable à tout moment."}</p>

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Titre</label>
        <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder={isRankUp ? "Ex. Épreuve du passage au rang supérieur" : "Ex. Courir un 10 km"} value={title} onChange={(e) => setTitle(e.target.value)} />

        {!isRankUp && (
          <>
            <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Rang (difficulté)</label>
            <select className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" value={rank} onChange={(e) => setRank(e.target.value)}>
              {["E", "D", "C", "B", "A", "S"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Attributs récompensés</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CODES.map((c) => (
                <button key={c} onClick={() => toggleCode(c)} className={"rounded border px-2 py-1 text-xs " + (codes.includes(c) ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>{c}</button>
              ))}
            </div>
          </>
        )}

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Étapes (une par ligne)</label>
        <textarea className="mt-1 h-24 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder={"Étape 1\nÉtape 2\nÉtape 3"} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Récompense (or à la complétion)</label>
        <input type="number" min={1} className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" value={rewardXp} onChange={(e) => setRewardXp(parseInt(e.target.value || "1", 10))} />

        <button onClick={create} className="mt-4 w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Créer le donjon</button>
      </SystemPanel>
      </div>
    </div>
  );
}

function DungeonCard({ d, locked, onToggle, onDel }: { d: Dungeon; locked: boolean; onToggle: (d: Dungeon, i: number) => void; onDel: (id: string) => void }) {
  const done = d.steps.filter((s) => s.done).length;
  const pct = d.steps.length ? Math.round((done / d.steps.length) * 100) : 0;
  const title = d.isRankUp ? "[ Passage de rang" + (d.targetRank ? " → " + d.targetRank : "") + (locked ? " 🔒" : " 🔓") + " ]" : "[ Donjon · Rang " + d.rank + " ]";
  return (
    <SystemPanel title={title}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{d.title} {d.status === "cleared" && <span className="text-emerald-400">✓ vaincu</span>}</p>
          <p className="text-[11px] text-system-text/50">{done}/{d.steps.length} étapes · {d.rewardXp} or{d.attributeCodes.length ? " · " + d.attributeCodes.join(" ") : ""}</p>
        </div>
        <button onClick={() => onDel(d.id)} className="shrink-0 rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">✕</button>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: pct + "%", backgroundColor: locked ? "#5a6b7a" : "#38e1ff" }} /></div>
      {locked && <p className="mt-2 text-[11px] text-amber-300/80">🔒 Verrouillé jusqu'au niveau max de ton rang.</p>}
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