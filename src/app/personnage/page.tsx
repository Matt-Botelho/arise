"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcAvatar from "@/components/LpcAvatar";
import { ITEMS, EQUIP_SLOTS, SLOT_LABEL, RARITY_COLORS, DEFAULT_EQUIPPED, type Equipped, type Slot } from "@/lib/lpc-items";

const SWATCH: Record<string, string> = { black: "#222", blue: "#3b5bdb", bluegray: "#7d8aa0", brown: "#85542b" };

export default function PersonnagePage() {
  const [equipped, setEquipped] = useState<Equipped>(DEFAULT_EQUIPPED);
  const [owned, setOwned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/character").then((r) => r.json()).then((d) => {
      if (!d.error) { setEquipped(d.equipped || DEFAULT_EQUIPPED); setOwned(d.owned || []); }
      setLoading(false);
    });
  }, []);

  async function equip(slot: Slot, key: string | null, color?: string) {
    const sel = key ? { key, ...(color ? { color } : {}) } : null;
    setEquipped((e) => ({ ...e, [slot]: sel }));
    await fetch("/api/character/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, key, color }) });
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Personnage</h1>
      <SystemPanel title="[ Aperçu ]">
        <div className="flex justify-center"><LpcAvatar equipped={equipped} size={224} /></div>
      </SystemPanel>

      {EQUIP_SLOTS.map((slot) => {
        const list = ITEMS.filter((i) => i.slot === slot && owned.includes(i.key));
        const cur = equipped[slot];
        return (
          <SystemPanel key={slot} title={"[ " + SLOT_LABEL[slot] + " ]"}>
            <div className="flex flex-wrap items-start gap-2">
              <button onClick={() => equip(slot, null)} className={"rounded border px-2 py-1 text-xs " + (!cur ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/50")}>Aucun</button>
              {list.map((it) => (
                <div key={it.key} className="flex flex-col items-center gap-1">
                  <button onClick={() => equip(slot, it.key, it.colors?.[0]?.name)} className="rounded px-2 py-1 text-xs"
                    style={{ border: (cur?.key === it.key ? "2px solid " : "1px solid ") + RARITY_COLORS[it.rarity], color: RARITY_COLORS[it.rarity] }}>
                    {it.name}
                  </button>
                  {cur?.key === it.key && it.colors && it.colors.length > 1 && (
                    <div className="flex gap-1">
                      {it.colors.map((c) => (
                        <button key={c.name} onClick={() => equip(slot, it.key, c.name)} title={c.name}
                          className={"h-4 w-4 rounded-full border " + (cur?.color === c.name ? "border-white" : "border-transparent")}
                          style={{ backgroundColor: SWATCH[c.name] || "#888" }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SystemPanel>
        );
      })}

      <p className="text-[11px] text-system-text/40">D'autres pièces s'ajouteront via le loot des quêtes et la boutique (prochaines étapes).</p>
    </div>
  );
}
