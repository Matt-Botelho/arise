"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SystemPanel from "@/components/SystemPanel";
import LpcAvatar from "@/components/LpcAvatar";
import ShadowCompanion from "@/components/ShadowCompanion";
import { DEFAULT_EQUIPPED, type Equipped } from "@/lib/lpc-items";

type Attr = { id: string; code: string; name: string; icon: string; color: string; level: number; xp: number; xpNext: number; capped: boolean };
type Penalty = { id: string; date: string; reason: string; hpLost: number; xpLost: number };
type Status = {
  hunter: {
    name: string; rank: string; globalLevel: number; globalXp: number; globalXpNext: number;
    ceiling: number; nextRank: string | null; rankUpAvailable: boolean; attrThreshold: number; minAttrLevel: number; levelReady: boolean; attrsReady: boolean;
    hp: number; maxHp: number; mp: number; maxMp: number; gold: number; title: string; streak: number; exhausted: boolean; onboarded: boolean;
  };
  attributes: Attr[]; power: number; penalties: Penalty[];
  shadow?: { essence: number; fed: boolean; stage: { key: string; name: string; xpPct: number; desc: string }; next: { name: string; at: number } | null };
  sets?: { active: { key: string; name: string; color: string; pieces: number; total: number }[]; completed: string[]; xpPct: number; goldPct: number; lootPct: number };
  mereons?: number;
};

const RANKS = ["F", "E", "D", "C", "B", "A", "S", "S+", "SS", "SS Elite"];

export default function StatutPage() {
  const [data, setData] = useState<Status | null>(null);
  const [equipped, setEquipped] = useState<Equipped | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : setData(d))).catch((e) => setErr(String(e)));
    fetch("/api/character").then((r) => r.json()).then((d) => { if (!d.error) setEquipped(d.equipped || DEFAULT_EQUIPPED); }).catch(() => {});
  }, []);
  if (err) return <p className="text-red-400">{err}</p>;
  if (!data) return <p className="animate-pulse text-system-accent">Connexion au Système…</p>;
  const h = data.hunter;
  const hpPct = h.maxHp > 0 ? Math.max(0, Math.round((h.hp / h.maxHp) * 100)) : 0;
  const gxpPct = h.globalXpNext > 0 ? Math.min(100, Math.round((h.globalXp / h.globalXpNext) * 100)) : 0;
  const floor = h.ceiling - 10;
  const rankPct = Math.max(0, Math.min(100, Math.round(((h.globalLevel - floor) / 10) * 100)));
  const rankIdx = RANKS.indexOf(h.rank);
  const attrsOkCount = data.attributes.filter((a) => a.level >= h.attrThreshold).length;
  const completedSet = data.sets && data.sets.completed.length ? data.sets.active.find((s) => data.sets && data.sets.completed.includes(s.key)) : null;

  return (
    <div>
      {!h.onboarded && (
        <a href="/onboarding" className="mb-4 block rounded-md border border-amber-400/60 bg-amber-400/10 p-3 text-center text-sm text-amber-200 system-glow">
          ✦ Bienvenue Chasseur — lance ton onboarding pour définir tes objectifs et tes quêtes →
        </a>
      )}
      <div className="md:grid md:grid-cols-[380px_minmax(0,1fr)] md:items-start md:gap-6">
      <div className="mb-4 md:mb-0 md:sticky md:top-4">
        <SystemPanel title="[ Chasseur ]">
          <div className="flex flex-col items-center">
            {equipped ? (
              <div className="relative">
                {completedSet && <div className="avatar-aura" style={{ "--aura": completedSet.color + "59" } as React.CSSProperties} />}
                <div className="avatar-breathe relative"><LpcAvatar equipped={equipped} size={320} /></div>
              </div>
            ) : <div className="h-[320px] w-full animate-pulse text-center text-system-accent">…</div>}
            {completedSet && <p className="mt-1 text-xs" style={{ color: completedSet.color }}>✦ {completedSet.name} — complète</p>}
            <h1 className="mt-3 text-2xl font-bold system-glow">{h.name}</h1>
            <p className="text-xs text-system-text/70">« {h.title} »</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-black text-system-accent system-glow">{h.rank}</span>
              <span className="mb-1 text-sm text-system-text/70">Niv. {h.globalLevel}</span>
            </div>
            {h.exhausted && <span className="mt-1 rounded border border-red-500/60 px-2 py-0.5 text-[11px] uppercase tracking-widest text-red-400">⚠ Épuisé</span>}
            <Link href="/personnage" className="mt-3 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Personnaliser →</Link>
          </div>
        </SystemPanel>
      </div>

      <div className="space-y-4">
        <SystemPanel title="[ Fenêtre de Statut ]">
          <div>
            <div className="flex justify-between text-[11px] uppercase tracking-widest text-system-text/50">
              <span>Niveau {h.globalLevel} / 100</span>
              <span>{h.rankUpAvailable ? "PALIER ATTEINT" : h.globalXp + " / " + h.globalXpNext + " XP"}</span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded bg-black/40">
              <div className="h-full" style={{ width: (h.rankUpAvailable ? 100 : gxpPct) + "%", backgroundColor: h.rankUpAvailable ? "#ffcf4d" : "#38e1ff" }} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] uppercase tracking-widest text-system-text/50"><span>PV</span><span>{h.hp}/{h.maxHp}</span></div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: hpPct + "%", backgroundColor: hpPct < 30 ? "#ff4d4d" : "#ff7a45" }} /></div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
            <Stat label="Série" value={"🔥 " + h.streak} />
            <Stat label="Énergie" value={h.mp + "/" + h.maxMp} />
            <Stat label="Or" value={String(h.gold)} />
            <Stat label="Méréons" value={"❖ " + (data.mereons ?? 0)} />
          </div>
          <p className="mt-3 text-center text-xs text-system-text/60">Puissance totale : <span className="text-system-accent">{data.power}</span>
            {data.sets && (data.sets.xpPct > 0 || data.sets.goldPct > 0 || data.sets.lootPct > 0) && <span className="ml-2 text-system-text/50">· Panoplies : +{data.sets.xpPct}% XP, +{data.sets.goldPct}% or, +{data.sets.lootPct}% loot</span>}
          </p>
        </SystemPanel>

        {data.shadow && (
          <SystemPanel title="[ Ton Ombre ]">
            <div className="flex items-center gap-4">
              <ShadowCompanion stageKey={data.shadow.stage.key} fed={data.shadow.fed} size={110} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: data.shadow.fed ? "#b06bff" : "#5f7285" }}>{data.shadow.stage.name}</p>
                <p className="text-xs italic text-system-text/60">{data.shadow.stage.desc}</p>
                <p className="mt-1 text-xs">
                  {data.shadow.fed
                    ? <span className="text-emerald-400">Nourrie — elle t&apos;accorde +{data.shadow.stage.xpPct}% XP.</span>
                    : <span className="text-system-text/50">Assombrie… valide toutes tes quêtes obligatoires pour la nourrir.</span>}
                </p>
                {data.shadow.next && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] text-system-text/50"><span>Essence : {data.shadow.essence}</span><span>{data.shadow.next.name} à {data.shadow.next.at}</span></div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: Math.min(100, Math.round((data.shadow.essence / data.shadow.next.at) * 100)) + "%", backgroundColor: "#b06bff" }} /></div>
                  </div>
                )}
              </div>
            </div>
            {data.sets && data.sets.active.length > 0 && (
              <div className="mt-3 border-t border-system-border/20 pt-2">
                <p className="mb-1 text-[11px] uppercase tracking-widest text-system-text/50">Panoplies portées</p>
                {data.sets.active.map((s) => (
                  <p key={s.key} className="text-xs" style={{ color: s.color }}>{s.pieces >= s.total ? "✦ " : "· "}{s.name} <span className="text-system-text/50">{s.pieces}/{s.total}</span></p>
                ))}
              </div>
            )}
          </SystemPanel>
        )}

        <SystemPanel title="[ Histoire Principale ]">
          <div className="flex flex-wrap items-center gap-1.5">
            {RANKS.map((r, i) => {
              const cur = i === rankIdx; const done = i < rankIdx;
              return <span key={r} className="rounded border px-2 py-0.5 text-xs" style={{ borderColor: cur ? "#ffcf4d" : done ? "rgba(56,225,255,.45)" : "rgba(95,114,133,.45)", color: cur ? "#ffcf4d" : done ? "#38e1ff" : "#5f7285", textShadow: cur ? "0 0 8px rgba(255,207,77,.4)" : "none" }}>{r}</span>;
            })}
          </div>

          {h.nextRank ? (
            <div className="mt-3">
              <p className="text-xs text-system-text/60">Acte en cours : <span className="text-system-accent">{h.rank}</span> → <span style={{ color: "#ffcf4d" }}>{h.nextRank}</span>. Réunis les conditions pour débloquer le Donjon de Changement de Rang.</p>

              <div className="mt-3">
                <div className="flex justify-between text-xs"><span className={h.levelReady ? "text-emerald-400" : "text-system-text/70"}>{h.levelReady ? "✓" : "○"} Niveau du rang</span><span className="text-system-text/60">{h.globalLevel}/{h.ceiling}</span></div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: Math.min(100, Math.round((h.globalLevel / h.ceiling) * 100)) + "%", backgroundColor: h.levelReady ? "#48e6a0" : "#38e1ff" }} /></div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs"><span className={h.attrsReady ? "text-emerald-400" : "text-system-text/70"}>{h.attrsReady ? "✓" : "○"} Chaque compétence au niveau {h.attrThreshold}</span><span className="text-system-text/60">{attrsOkCount}/{data.attributes.length}</span></div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {data.attributes.map((a) => {
                    const ok = a.level >= h.attrThreshold; const pct = Math.min(100, Math.round((a.level / Math.max(1, h.attrThreshold)) * 100));
                    return (
                      <div key={a.code} className="flex items-center gap-2">
                        <span className="w-5 text-xs">{a.icon}</span>
                        <span className="w-8 text-xs text-system-text/50">{a.code}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: pct + "%", backgroundColor: ok ? "#48e6a0" : a.color }} /></div>
                        <span className="w-9 text-right text-xs" style={{ color: ok ? "#48e6a0" : undefined }}>{ok ? "✓ " : ""}{a.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {h.rankUpAvailable && <Link href="/donjons" className="mt-3 block text-sm text-amber-300 system-glow">⩘ Donjon de Changement de Rang débloqué — entre dans l'onglet Donjons !</Link>}
            </div>
          ) : <p className="mt-3 text-xs text-system-text/60">Rang maximal atteint. 👑</p>}
        </SystemPanel>

        <SystemPanel title="[ Attributs ]">
          <p className="mb-2 text-xs text-system-text/50">Les attributs sont plafonnés à ton niveau global ({h.globalLevel}). Monte de rang pour les débloquer.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{data.attributes.map((a) => <AttributeRow key={a.id} a={a} />)}</div>
        </SystemPanel>

        {data.penalties.length > 0 && (
          <SystemPanel title="[ Zone de pénalité ]">
            <ul className="space-y-1 text-xs text-system-text/70">
              {data.penalties.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 border-b border-system-border/15 pb-1 last:border-0"><span>{p.date} · {p.reason}</span><span className="shrink-0 text-red-400">-{p.hpLost} PV{p.xpLost ? " · -" + p.xpLost + " XP" : ""}</span></li>
              ))}
            </ul>
          </SystemPanel>
        )}
      </div>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-system-border/30 bg-black/30 py-2"><div className="text-system-accent">{value}</div><div className="text-[11px] uppercase tracking-widest text-system-text/50">{label}</div></div>;
}
function AttributeRow({ a }: { a: Attr }) {
  const pct = a.capped ? 100 : (a.xpNext > 0 ? Math.min(100, Math.round((a.xp / a.xpNext) * 100)) : 0);
  return (
    <div className="rounded border border-system-border/30 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2"><span>{a.icon}</span><span className="text-sm">{a.name}</span></span>
        <span className="text-sm" style={{ color: a.color }}>Niv. {a.level}{a.capped ? " · MAX" : ""}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full" style={{ width: pct + "%", backgroundColor: a.capped ? "#ffcf4d" : a.color }} /></div>
      <div className="mt-1 text-right text-[11px] text-system-text/50">{a.capped ? "plafonné (niv. global " + "atteint)" : a.xp + "/" + a.xpNext + " XP"}</div>
    </div>
  );
}
