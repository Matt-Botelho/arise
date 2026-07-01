"use client";
import { useEffect, useState } from "react";
import LpcItemThumb from "@/components/LpcItemThumb";
import Typewriter from "@/components/Typewriter";
import { RARITY_COLORS, RARITY_LABEL, SLOT_LABEL, ITEM_BY_KEY, type Rarity, type Slot } from "@/lib/lpc-items";

export type LootDrop = {
  key: string; name: string; rarity: string; lore?: string; pityTriggered?: boolean;
  set?: { name: string; color: string; owned: number; total: number } | null;
};

// Cérémonie de butin : carte qui se retourne, cadre par rareté, lore, progression de panoplie.
export default function LootCard({ drop, onClose }: { drop: LootDrop; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFlipped(true), 350); return () => clearTimeout(t); }, []);
  const color = RARITY_COLORS[drop.rarity as Rarity] || "#4d9bff";
  const item = ITEM_BY_KEY[drop.key];
  const high = drop.rarity === "legendaire" || drop.rarity === "mythique";
  return (
    <div className="loot-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      {high && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="loot-spark" style={{ left: (i * 41 % 100) + "%", animationDelay: (i * 0.13) + "s", backgroundColor: color }} />
          ))}
        </div>
      )}
      <div className="loot-flip" style={{ perspective: "900px" }} onClick={(e) => e.stopPropagation()}>
        <div className={"loot-card relative " + (flipped ? "is-flipped" : "")}>
          {/* Dos de la carte */}
          <div className="loot-face loot-back flex items-center justify-center rounded-lg border-2 border-system-border bg-system-panel">
            <span className="text-4xl text-system-accent system-glow">✦</span>
          </div>
          {/* Face de la carte */}
          <div className="loot-face loot-front flex flex-col items-center rounded-lg border-2 bg-system-panel p-5 text-center" style={{ borderColor: color, boxShadow: "0 0 30px " + color + "66, inset 0 0 25px " + color + "22" }}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-system-text/50">{drop.pityTriggered ? "— Le Système récompense ta persévérance —" : "— Butin obtenu —"}</p>
            <div className="mt-3 rounded bg-black/40 p-2" style={{ border: "1px solid " + color }}>
              <LpcItemThumb itemKey={drop.key} size={120} />
            </div>
            <p className="mt-3 text-lg font-bold" style={{ color, textShadow: "0 0 10px " + color + "88" }}>{drop.name}</p>
            <p className="text-xs text-system-text/60">{item ? (SLOT_LABEL[item.slot as Slot] || item.slot) + " · " : ""}{RARITY_LABEL[drop.rarity as Rarity] || drop.rarity}</p>
            {drop.lore && <p className="mt-2 max-w-[240px] text-xs italic text-system-text/70"><Typewriter text={"« " + drop.lore + " »"} /></p>}
            {drop.set && (
              <div className="mt-3 w-full rounded border border-system-border/30 bg-black/30 p-2">
                <p className="text-xs" style={{ color: drop.set.color }}>{drop.set.name}</p>
                <p className="text-[11px] text-system-text/60">{drop.set.owned}/{drop.set.total} pièces possédées{drop.set.owned >= drop.set.total ? " — PANOPLIE COMPLÈTE ✦" : ""}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/50">
                  <div className="h-full" style={{ width: Math.round((drop.set.owned / drop.set.total) * 100) + "%", backgroundColor: drop.set.color }} />
                </div>
              </div>
            )}
            <button onClick={onClose} className="mt-4 rounded border border-system-border px-4 py-1.5 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Récupérer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
