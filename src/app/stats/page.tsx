"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcItemThumb from "@/components/LpcItemThumb";
import { TIER_LABEL, TIER_COLOR, type Tier } from "@/lib/achievements";
import { playLevelUp, setSfxEnabled } from "@/lib/sfx";

type Pt = { day: string; xp: number; done: number; failed: number };
type Attr = { code: string; name: string; color: string; level: number };
type Reward = { gold: number; shards: number; skin?: string };
type Ach = { key: string; name: string; description: string; icon: string; tier: string; reward: Reward; unlocked: boolean };
type TitleOpt = { key: string; name: string; icon: string };

const TIERS: Tier[] = ["bronze", "argent", "or", "legendaire"];

export default function StatsPage() {
  const [series, setSeries] = useState<Pt[]>([]);
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [achs, setAchs] = useState<Ach[]>([]);
  const [titles, setTitles] = useState<TitleOpt[]>([]);
  const [activeTitle, setActiveTitle] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/history").then((r) => r.json()),
      fetch("/api/achievements").then((r) => r.json()),
    ]).then(([h, a]) => {
      setSeries(h.series || []);
      setAttrs(h.attributes || []);
      setAchs(a.achievements || []);
      setTitles(a.titles || []);
      setActiveTitle(a.activeTitle || "");
      if (a.newlyUnlocked && a.newlyUnlocked.length) {
        setSfxEnabled(true); playLevelUp();
        flash("🏆 Succès débloqué : " + a.newlyUnlocked.map((x: { name: string }) => x.name).join(", "));
      }
      setLoading(false);
    });
  }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 5000); }
  async function chooseTitle(name: string) {
    setActiveTitle(name);
    await fetch("/api/achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titleName: name }) });
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  const maxXp = Math.max(1, ...series.map((s) => s.xp));
  const maxLvl = Math.max(1, ...attrs.map((a) => a.level));
  const totalDone = series.reduce((s, p) => s + p.done, 0);
  const totalXp = series.reduce((s, p) => s + p.xp, 0);
  const unlocked = achs.filter((a) => a.unlocked).length;
  const n = Math.max(1, series.length);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-center text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Stats & Trophées</h1>

      <div className="cards">
      <SystemPanel title="[ Titre équipé ]">
        <p className="text-sm">Actuel : <span className="text-system-accent system-glow">« {activeTitle || "—"} »</span></p>
        <p className="mt-1 text-[11px] text-system-text/40">S'affiche sur ta fiche de Chasseur (onglet Statut).</p>
        {titles.length > 0 && (
          <select className="mt-2 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" value={activeTitle} onChange={(e) => chooseTitle(e.target.value)}>
            {!titles.some((t) => t.name === activeTitle) && <option value={activeTitle}>{activeTitle || "—"}</option>}
            {titles.map((t) => <option key={t.key} value={t.name}>{t.icon} {t.name}</option>)}
          </select>
        )}
      </SystemPanel>

      <SystemPanel title="[ XP par jour (30 j) ]">
        <svg viewBox="0 0 300 80" className="w-full" preserveAspectRatio="none">
          {series.map((s, i) => {
            const w = 300 / n;
            const hh = Math.round((s.xp / maxXp) * 70);
            return <rect key={i} x={i * w + 0.5} y={78 - hh} width={Math.max(1, w - 1)} height={hh} fill="#38e1ff" opacity={s.xp > 0 ? 0.9 : 0.15} />;
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
      </div>

      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm uppercase tracking-[0.2em] text-system-accent/80">Trophées</h2>
        <span className="text-xs text-system-text/60">{unlocked}/{achs.length}</span>
      </div>

      <div className="cards">
      {TIERS.map((tier) => {
        const items = achs.filter((a) => a.tier === tier);
        if (!items.length) return null;
        const got = items.filter((a) => a.unlocked).length;
        return (
          <SystemPanel key={tier} title={"[ " + TIER_LABEL[tier] + " · " + got + "/" + items.length + " ]"}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((a) => (
                <div key={a.key} className="rounded border p-2 text-center" style={{ borderColor: a.unlocked ? TIER_COLOR[tier] : "rgba(31,111,235,0.2)", opacity: a.unlocked ? 1 : 0.45 }}>
                  <div className="text-2xl">{a.icon}</div>
                  <div className="mt-1 text-[11px] font-bold">{a.name}</div>
                  <div className="text-[10px] text-system-text/50">{a.description}</div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-[10px]">
                    {a.reward.gold > 0 && <span>🪙 {a.reward.gold}</span>}
                    {a.reward.shards > 0 && <span style={{ color: "#b06bff" }}>✦ {a.reward.shards}</span>}
                  </div>
                  {a.reward.skin && (
                    <div className="mt-1 flex flex-col items-center">
                      <div className="rounded bg-black/30"><LpcItemThumb itemKey={a.reward.skin} size={40} /></div>
                      <span className="text-[9px]" style={{ color: TIER_COLOR[tier] }}>skin exclusif</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SystemPanel>
        );
      })}
      </div>
    </div>
  );
}
