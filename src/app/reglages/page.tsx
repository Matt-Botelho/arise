"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";

type Settings = { name: string; penaltyIntensity: string; dayRolloverHour: number; timezone: string };

export default function ReglagesPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => !d.error && setS(d));
  }, []);

  async function save() {
    if (!s) return;
    const r = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).then((res) => res.json());
    setToast(r.ok ? "Réglages enregistrés" : (r.error || "Erreur"));
    setTimeout(() => setToast(null), 3000);
  }

  if (!s) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">
          [Système] {toast}
        </div>
      )}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Réglages</h1>

      <SystemPanel title="[ Chasseur ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Nom</label>
        <input
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.name}
          onChange={(e) => setS({ ...s, name: e.target.value })}
        />
      </SystemPanel>

      <SystemPanel title="[ Pénalités ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Intensité (quête obligatoire ratée)</label>
        <select
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.penaltyIntensity}
          onChange={(e) => setS({ ...s, penaltyIntensity: e.target.value })}
        >
          <option value="off">Off — aucune pénalité</option>
          <option value="douce">Douce — léger malus, reset de série</option>
          <option value="fidele">Fidèle — perte de PV/XP (recommandé)</option>
          <option value="hardcore">Hardcore — grosse perte de PV/XP</option>
        </select>

        <label className="mt-4 block text-xs uppercase tracking-widest text-system-text/60">Heure de bascule de journée (0-23)</label>
        <input
          type="number" min={0} max={23}
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.dayRolloverHour}
          onChange={(e) => setS({ ...s, dayRolloverHour: parseInt(e.target.value || "0", 10) })}
        />

        <label className="mt-4 block text-xs uppercase tracking-widest text-system-text/60">Fuseau horaire</label>
        <input
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.timezone}
          onChange={(e) => setS({ ...s, timezone: e.target.value })}
        />
      </SystemPanel>

      <button onClick={save} className="w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10">
        Enregistrer
      </button>
    </div>
  );
}
