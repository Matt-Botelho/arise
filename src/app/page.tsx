"use client";
// QG — le dashboard principal : tout ce qui compte aujourd'hui, en un écran.
import { useEffect, useState } from "react";
import Link from "next/link";
import SystemPanel from "@/components/SystemPanel";
import LpcAvatar from "@/components/LpcAvatar";
import ShadowCompanion from "@/components/ShadowCompanion";
import LootCard, { type LootDrop } from "@/components/LootCard";
import { DEFAULT_EQUIPPED, type Equipped } from "@/lib/lpc-items";
import { ATTRIBUTES } from "@/lib/game.config";
import { METRIC_BY_KEY } from "@/lib/health";
import { setSfxEnabled, playXp, playLevelUp, playLoot, playObjective } from "@/lib/sfx";

type Quest = { id: string; title: string; type: string; attributeCodes: string[]; baseXp: number; difficulty: string; isMandatory: boolean; done: boolean; metricKey?: string | null; threshold?: number | null; todayValue?: number };
type Weekly = { id: string; title: string; steps: { label: string; done: boolean }[]; status: string };
type Obj = { id: string; title: string; horizon: string; status: string; frac: number; done: boolean; attributeCode: string; parentId: string | null };
type Status = {
  hunter: { name: string; rank: string; globalLevel: number; globalXp: number; globalXpNext: number; rankUpAvailable: boolean; hp: number; maxHp: number; gold: number; title: string; streak: number; onboarded: boolean };
  shadow?: { essence: number; fed: boolean; stage: { key: string; name: string; xpPct: number } };
  sets?: { completed: string[]; active: { key: string; name: string; color: string; pieces: number; total: number }[] };
  mereons?: number; bestWeekScore?: number;
};
type Almanax = { offering: { title: string; desc: string; mereons: number; done: boolean }; mereons: number };
type Gate = { id: string; rank: string; title: string; gold: number; xp: number; status: string; color: string };
type OathsInfo = { catalog: { key: string; name: string; icon: string; xpMult: number }[]; active: string[]; locked: boolean };

export default function QGPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [equipped, setEquipped] = useState<Equipped | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [weeklies, setWeeklies] = useState<Weekly[]>([]);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [almanax, setAlmanax] = useState<Almanax | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [oaths, setOaths] = useState<OathsInfo | null>(null);
  const [drop, setDrop] = useState<LootDrop | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [st, q, w, o, al, ga, oa, ch] = await Promise.all([
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/quests").then((r) => r.json()),
      fetch("/api/weeklies").then((r) => r.json()).catch(() => null),
      fetch("/api/objectives").then((r) => r.json()).catch(() => null),
      fetch("/api/almanax").then((r) => r.json()).catch(() => null),
      fetch("/api/gates").then((r) => r.json()).catch(() => null),
      fetch("/api/oaths").then((r) => r.json()).catch(() => null),
      fetch("/api/character").then((r) => r.json()).catch(() => null),
    ]);
    if (!st.error) setStatus(st);
    setQuests((q.quests || []).filter((x: Quest) => x.type !== "rankup"));
    setSfxEnabled(q.sfxEnabled !== false);
    if (w && !w.error) setWeeklies(w.weeklies || []);
    if (o && !o.error) setObjs(o.objectives || []);
    if (al && !al.error) setAlmanax(al);
    setGate(ga && ga.gate ? ga.gate : null);
    if (oa && !oa.error) setOaths(oa);
    if (ch && !ch.error) setEquipped(ch.equipped || DEFAULT_EQUIPPED);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string, ms = 5000) { setToast(m); setTimeout(() => setToast(null), ms); }

  async function complete(id: string) {
    const r = await fetch("/api/quests/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: id }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    if (r.globalLeveledUp || (r.levelUps && r.levelUps.length)) playLevelUp(); else playXp();
    if (r.drop) { playLoot(r.drop.rarity); setDrop(r.drop); }
    if (r.objective?.justCompleted) playObjective();
    let msg = "+" + r.gained + " XP · +" + r.goldGain + " or";
    if (r.almanax) msg += " · ❖ Offrande accomplie !";
    flash(msg); load();
  }
  async function clearGate() {
    if (!gate) return;
    const r = await fetch("/api/gates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: gate.id }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3000); return; }
    playLevelUp();
    flash("⛩ Porte franchie ! +" + r.gained + " XP, +" + r.goldGain + " or", 6000);
    load();
  }
  async function claimAlmanax() {
    const r = await fetch("/api/almanax", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim" }) }).then((res) => res.json());
    if (r.error) { flash(r.error, 3500); return; }
    playObjective();
    flash("❖ Offrande accomplie : +" + r.reward.mereons + " ❖, +" + r.reward.gold + " or");
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Connexion au Système…</p>;
  const h = status?.hunter;
  const remaining = quests.filter((q) => !q.done);
  const doneCount = quests.length - remaining.length;
  const gxpPct = h && h.globalXpNext > 0 ? Math.min(100, Math.round((h.globalXp / h.globalXpNext) * 100)) : 0;
  const hpPct = h && h.maxHp > 0 ? Math.max(0, Math.round((h.hp / h.maxHp) * 100)) : 0;
  const mainObjs = objs.filter((o) => o.status !== "done" && !o.done && o.horizon === "long").slice(0, 3);
  const shortObjs = objs.filter((o) => o.status !== "done" && !o.done && o.horizon === "court").slice(0, 4);
  const weeklyActive = weeklies.filter((w) => w.status !== "done");
  const completedSet = status?.sets && status.sets.completed.length ? status.sets.active.find((s) => status.sets?.completed.includes(s.key)) : null;

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 w-max max-w-[92vw] -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-center text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      {drop && <LootCard drop={drop} onClose={() => setDrop(null)} />}
      {h && !h.onboarded && (
        <a href="/onboarding" className="block rounded-md border border-amber-400/60 bg-amber-400/10 p-3 text-center text-sm text-amber-200 system-glow">
          ✦ Bienvenue Chasseur — lance ton onboarding pour définir tes objectifs et tes quêtes →
        </a>
      )}

      {/* Bandeau chasseur compact */}
      {h && (
        <div className="system-in flex flex-wrap items-center gap-4 rounded-md border border-system-border/60 bg-system-panel/70 p-3 shadow-system">
          <Link href="/statut" className="relative shrink-0" title="Voir la fiche complète">
            {completedSet && <div className="avatar-aura" style={{ "--aura": completedSet.color + "59" } as React.CSSProperties} />}
            <div className="avatar-breathe relative"><LpcAvatar equipped={equipped || DEFAULT_EQUIPPED} size={96} /></div>
          </Link>
          <div className="min-w-[180px] flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-system-accent system-glow">{h.rank}</span>
              <span className="font-bold">{h.name}</span>
              <span className="text-xs text-system-text/60">Niv. {h.globalLevel} · « {h.title} »</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: (h.rankUpAvailable ? 100 : gxpPct) + "%", backgroundColor: h.rankUpAvailable ? "#ffcf4d" : "#38e1ff" }} /></div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: hpPct + "%", backgroundColor: hpPct < 30 ? "#ff4d4d" : "#ff7a45" }} /></div>
            {h.rankUpAvailable && <Link href="/donjons" className="mt-1 block text-xs text-amber-300 system-glow">⩘ Donjon de rang débloqué !</Link>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5 text-sm">
            <span className="rounded border border-system-border/40 bg-black/30 px-2 py-1">🔥 {h.streak}</span>
            <span className="rounded border border-system-border/40 bg-black/30 px-2 py-1">🪙 {h.gold}</span>
            <span className="rounded border border-system-border/40 bg-black/30 px-2 py-1" style={{ color: "#ffcf4d" }}>❖ {status?.mereons ?? 0}</span>
            {status?.shadow && (
              <span className="flex items-center gap-1 rounded border border-system-border/40 bg-black/30 px-2 py-1" title={status.shadow.stage.name}>
                <ShadowCompanion stageKey={status.shadow.stage.key} fed={status.shadow.fed} size={22} />
                <span className="text-xs" style={{ color: status.shadow.fed ? "#b06bff" : "#5f7285" }}>{status.shadow.fed ? "+" + status.shadow.stage.xpPct + "%" : "😴"}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Événements du jour : Porte + Almanax + Serments */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {gate && gate.status === "open" ? (
          <div className="anim-pop rounded-md border p-3" style={{ borderColor: gate.color, boxShadow: "0 0 14px " + gate.color + "44" }}>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: gate.color }}>⛩ Porte de rang {gate.rank}</p>
            <p className="mt-1 text-sm font-bold">{gate.title}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-system-text/50">+{gate.xp} XP · +{gate.gold} or · expire ce soir</span>
              <button onClick={clearGate} className="rounded border px-2.5 py-1 text-xs uppercase tracking-widest hover:bg-white/5" style={{ borderColor: gate.color, color: gate.color }}>Franchir</button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-system-border/30 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-system-text/40">⛩ Portes</p>
            <p className="mt-1 text-sm text-system-text/50">{gate ? "Porte du jour franchie ✓" : "Aucune Porte aujourd'hui. Le Système observe…"}</p>
          </div>
        )}

        {almanax && (
          <div className="rounded-md border border-amber-400/40 bg-amber-400/5 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300">☀ Almanax</p>
            <p className={"mt-1 text-sm " + (almanax.offering.done ? "text-emerald-400" : "")}>{almanax.offering.done ? "✓ " : "✦ "}{almanax.offering.title}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-system-text/50">{almanax.offering.desc} (+{almanax.offering.mereons} ❖)</span>
              {!almanax.offering.done && <button onClick={claimAlmanax} className="rounded border border-amber-400/60 px-2.5 py-1 text-xs uppercase tracking-widest text-amber-300 hover:bg-amber-400/10">Valider</button>}
            </div>
          </div>
        )}

        {oaths && (
          <div className="rounded-md border border-system-border/40 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-system-accent">⚔️ Serments</p>
            {oaths.locked ? (
              <p className="mt-1 text-sm">{oaths.active.map((k) => { const o = oaths.catalog.find((x) => x.key === k); return o ? o.icon + " " + o.name + " " : ""; })}<span className="text-xs text-emerald-400">scellés</span></p>
            ) : (
              <p className="mt-1 text-sm text-system-text/60">Aucun serment prêté. <Link href="/quetes" className="text-system-accent hover:underline">Multiplier mes gains →</Link></p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Quêtes du jour avec validation rapide */}
        <SystemPanel title={"[ Aujourd'hui · " + doneCount + "/" + quests.length + " ]"}>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full bg-emerald-400" style={{ width: (quests.length ? Math.round((doneCount / quests.length) * 100) : 0) + "%" }} /></div>
          {remaining.length === 0 ? (
            <p className="text-sm text-emerald-400">Toutes les quêtes du jour sont validées. L&apos;Ombre est fière. 🐺</p>
          ) : remaining.map((q) => {
            const isAuto = q.type === "auto" && q.metricKey && typeof q.threshold === "number";
            const def = isAuto ? METRIC_BY_KEY[q.metricKey as string] : null;
            const val = q.todayValue ?? 0;
            const pct = isAuto ? Math.min(100, Math.round((val / (q.threshold as number)) * 100)) : 0;
            const a = ATTRIBUTES.find((x) => x.code === q.attributeCodes[0]);
            return (
              <div key={q.id} className="flex items-center justify-between gap-2 border-b border-system-border/15 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{q.isMandatory ? "★ " : ""}{a ? a.icon + " " : ""}{q.title}</p>
                  {isAuto ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 max-w-[120px] flex-1 overflow-hidden rounded bg-black/40"><div className="h-full bg-system-accent" style={{ width: pct + "%" }} /></div>
                      <span className="text-[10px] text-system-text/50">{def?.icon} {Math.round(val)}/{Math.round(q.threshold as number)}</span>
                    </div>
                  ) : <p className="text-[11px] text-system-text/40">{q.difficulty} · {q.baseXp} XP</p>}
                </div>
                {isAuto
                  ? <span className="shrink-0 text-[10px] uppercase tracking-widest text-system-text/40">auto</span>
                  : <button onClick={() => complete(q.id)} className="shrink-0 rounded border border-system-border px-2.5 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">✓</button>}
              </div>
            );
          })}
          <Link href="/quetes" className="mt-2 block text-right text-xs text-system-accent hover:underline">Tout voir →</Link>
        </SystemPanel>

        <div className="space-y-4">
          {/* Aventure : objectifs principaux */}
          <SystemPanel title="[ Aventure en cours ]">
            {mainObjs.length === 0 && shortObjs.length === 0 && <p className="text-sm text-system-text/60">Aucun objectif actif. Lance l&apos;Assistant dans ⚙ Configuration.</p>}
            {mainObjs.map((o) => {
              const a = ATTRIBUTES.find((x) => x.code === o.attributeCode);
              return (
                <div key={o.id} className="mb-2.5 last:mb-0">
                  <div className="flex justify-between text-sm"><span className="truncate font-bold">◆ {o.title}</span><span className="shrink-0 text-xs text-system-text/50">{Math.round(o.frac * 100)}%</span></div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: Math.round(o.frac * 100) + "%", backgroundColor: a?.color || "#38e1ff" }} /></div>
                </div>
              );
            })}
            {shortObjs.length > 0 && (
              <div className="mt-3 border-t border-system-border/20 pt-2">
                <p className="mb-1 text-[11px] uppercase tracking-widest text-system-text/50">Quêtes courtes</p>
                {shortObjs.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <div className="h-1 w-16 shrink-0 overflow-hidden rounded bg-black/40"><div className="h-full bg-system-accent" style={{ width: Math.round(o.frac * 100) + "%" }} /></div>
                    <span className="truncate text-system-text/70">{o.title}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/objectifs" className="mt-2 block text-right text-xs text-system-accent hover:underline">L&apos;Aventure →</Link>
          </SystemPanel>

          {/* Hebdo compact */}
          <SystemPanel title="[ Missions de la semaine ]">
            {weeklyActive.length === 0 ? (
              <p className="text-sm text-system-text/60">{weeklies.length ? "Missions hebdo accomplies ✓" : "Aucune mission cette semaine."}</p>
            ) : weeklyActive.map((w) => {
              const done = w.steps.filter((s) => s.done).length;
              const pct = w.steps.length ? Math.round((done / w.steps.length) * 100) : 0;
              return (
                <div key={w.id} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-sm"><span className="truncate">{w.title}</span><span className="shrink-0 text-xs text-system-text/50">{done}/{w.steps.length}</span></div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full bg-amber-400" style={{ width: pct + "%" }} /></div>
                </div>
              );
            })}
            <Link href="/quetes" className="mt-2 block text-right text-xs text-system-accent hover:underline">Cocher les étapes →</Link>
          </SystemPanel>
        </div>
      </div>
    </div>
  );
}
