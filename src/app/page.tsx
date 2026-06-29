"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { xpForLevel } from "@/lib/game";

type Attr = { id: string; code: string; name: string; icon: string; color: string; level: number; xp: number };
type Penalty = { id: string; date: string; reason: string; hpLost: number; xpLost: number };
type Status = {
  hunter: { name: string; rank: string; hp: number; maxHp: number; mp: number; maxMp: number; gold: number; title: string; streak: number; exhausted: boolean };
  attributes: Attr[];
  power: number;
  promotion: { nextRank: string | null; eligible: boolean; required: number | null; progress: number; missing: { code: string; level: number }[] };
  penalties: Penalty[];
};

export default function StatutPage() {
  const [data, setData] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : setData(d))).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <p className="text-red-400">{err}</p>;
  if (!data) return <p className="animate-pulse text-system-accent">Connexion au Système…</p>;

  const h = data.hunter;
  const hpPct = h.maxHp > 0 ? Math.max(0, Math.round((h.hp / h.maxHp) * 100)) : 0;

  return (
    <div className="space-y-4">
      <SystemPanel title="[ Fenêtre de Statut ]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-system-text/60">CHASSEUR</p>
            <h1 className="text-2xl font-bold system-glow">{h.name}</h1>
            <p className="text-sm text-system-text/70">« {h.title} »</p>
            {h.exhausted && (
              <span className="mt-1 inline-block rounded border border-red-500/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-red-400">
                ⚠ Épuisé — gains d'XP réduits
              </span>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-system-text/60">RANG</p>
            <div className="text-5xl font-black text-system-accent system-glow">{h.rank}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-system-text/50">
            <span>PV</span><span>{h.hp}/{h.maxHp}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40">
            <div className="h-full" style={{ width: hpPct + "%", backgroundColor: hpPct < 30 ? "#ff4d4d" : "#ff7a45" }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="Série" value={"🔥 " + h.streak} />
          <Stat label="Énergie" value={h.mp + "/" + h.maxMp} />
          <Stat label="Or" value={String(h.gold)} />
        </div>
        <p className="mt-3 text-center text-xs text-system-text/60">Puissance totale : <span className="text-system-accent">{data.power}</span></p>
      </SystemPanel>

      {data.promotion.nextRank && (
        <SystemPanel title="[ Progression de rang ]">
          <div className="flex items-center justify-between text-sm">
            <span>Rang {h.rank} → {data.promotion.nextRank}</span>
            <span className="text-system-text/60">niv. {data.promotion.required} requis partout</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-black/40">
            <div className="h-full bg-system-accent" style={{ width: Math.round(data.promotion.progress * 100) + "%" }} />
          </div>
          {data.promotion.eligible
            ? <p className="mt-2 text-sm text-emerald-400 system-glow">✦ Épreuve de promotion débloquée — va dans l'onglet Quêtes !</p>
            : <p className="mt-2 text-xs text-system-text/60">À monter : {data.promotion.missing.map((m) => m.code).join(", ")}</p>}
        </SystemPanel>
      )}

      <SystemPanel title="[ Attributs ]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.attributes.map((a) => <AttributeRow key={a.id} a={a} />)}
        </div>
      </SystemPanel>

      {data.penalties.length > 0 && (
        <SystemPanel title="[ Zone de pénalité ]">
          <ul className="space-y-1 text-xs text-system-text/70">
            {data.penalties.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 border-b border-system-border/15 pb-1 last:border-0">
                <span>{p.date} · {p.reason}</span>
                <span className="shrink-0 text-red-400">-{p.hpLost} PV{p.xpLost ? " · -" + p.xpLost + " XP" : ""}</span>
              </li>
            ))}
          </ul>
        </SystemPanel>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-system-border/30 bg-black/30 py-2">
      <div className="text-system-accent">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-system-text/50">{label}</div>
    </div>
  );
}

function AttributeRow({ a }: { a: Attr }) {
  const need = xpForLevel(a.level);
  const pct = need > 0 ? Math.min(100, Math.round((a.xp / need) * 100)) : 0;
  return (
    <div className="rounded border border-system-border/30 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2"><span>{a.icon}</span><span className="text-sm">{a.name}</span></span>
        <span className="text-sm" style={{ color: a.color }}>Niv. {a.level}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-black/40">
        <div className="h-full" style={{ width: pct + "%", backgroundColor: a.color }} />
      </div>
      <div className="mt-1 text-right text-[10px] text-system-text/50">{a.xp}/{need} XP</div>
    </div>
  );
}
