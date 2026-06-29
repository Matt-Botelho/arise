"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";

type Step = { label: string; done: boolean };
type Dungeon = { id: string; title: string; description: string; rank: string; steps: Step[]; attributeCodes: string[]; rewardXp: number; status: string };
type LevelUp = { code: string; name: string; level: number };

const CODES = ["FOR", "VIT", "INT", "VOL", "FIN", "FAM", "TRA", "JAR", "ART"];

export default function DonjonsPage() {
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState("D");
  const [stepsText, setStepsText] = useState("");
  const [rewardXp, setRewardXp] = useState(300);
  const [codes, setCodes] = useState<string[]>([]);

  async function load() {
    const r = await fetch("/api/dungeons").then((res) => res.json());
    setDungeons(r.dungeons || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3500); }

  async function toggle(dungeonId: string, index: number) {
    const r = await fetch("/api/dungeons/step", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dungeonId, index }),
    }).then((res) => res.json());
    if (r.cleared) {
      const lv = (r.levelUps as LevelUp[] | undefined)?.map((l) => l.name + " Niv." + l.level).join(" · ");
      flash("🏰 Donjon vaincu !" + (lv ? " " + lv : ""));
    }
    load();
  }

  async function create() {
    if (!title.trim()) return;
    const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const r = await fetch("/api/dungeons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, rank, steps, rewardXp, attributeCodes: codes }),
    }).then((res) => res.json());
    if (r.ok) { setTitle(""); setStepsText(""); setRewardXp(300); setCodes([]); load(); } else flash(r.error || "Erreur");
  }

  async function del(id: string) {
    await fetch("/api/dungeons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  function toggleCode(c: string) { setCodes((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])); }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Donjons</h1>

      {dungeons.length === 0 && (
        <SystemPanel><p className="text-sm text-system-text/60">Aucun donjon. Crée ton premier objectif long ci-dessous.</p></SystemPanel>
      )}

      {dungeons.map((d) => {
        const done = d.steps.filter((s) => s.done).length;
        const pct = d.steps.length ? Math.round((done / d.steps.length) * 100) : 0;
        return (
          <SystemPanel key={d.id} title={"[ Donjon · Rang " + d.rank + " ]"}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">
                  {d.title} {d.status === "cleared" && <span className="text-emerald-400">✓ vaincu</span>}
                </p>
                <p className="text-[11px] text-system-text/50">{done}/{d.steps.length} étapes · {d.rewardXp} XP · {d.attributeCodes.join(" ")}</p>
              </div>
              <button onClick={() => del(d.id)} className="shrink-0 rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">✕</button>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full bg-system-accent" style={{ width: pct + "%" }} /></div>
            <ul className="mt-3 space-y-1">
              {d.steps.map((s, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.done} onChange={() => toggle(d.id, i)} />
                    <span className={s.done ? "line-through opacity-50" : ""}>{s.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </SystemPanel>
        );
      })}

      <SystemPanel title="[ Nouveau donjon ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Titre</label>
        <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Ex. Courir un 10 km" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Rang (difficulté)</label>
        <select className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" value={rank} onChange={(e) => setRank(e.target.value)}>
          {["E", "D", "C", "B", "A", "S"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Étapes (une par ligne)</label>
        <textarea className="mt-1 h-24 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder={"Courir 3 km\nCourir 5 km\nCourir 10 km"} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Récompense (XP)</label>
        <input type="number" min={1} className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" value={rewardXp} onChange={(e) => setRewardXp(parseInt(e.target.value || "1", 10))} />

        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Attributs récompensés</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {CODES.map((c) => (
            <button key={c} onClick={() => toggleCode(c)} className={"rounded border px-2 py-1 text-xs " + (codes.includes(c) ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>{c}</button>
          ))}
        </div>

        <button onClick={create} className="mt-4 w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Créer le donjon</button>
      </SystemPanel>
    </div>
  );
}
