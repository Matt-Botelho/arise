"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcAvatar from "@/components/LpcAvatar";
import { ITEMS, EQUIP_SLOTS, SLOT_LABEL, RARITY_COLORS, DEFAULT_EQUIPPED, type Equipped, type Slot } from "@/lib/lpc-items";

const SW: Record<string, string> = { black:"#222", blue:"#3b5bdb", bluegray:"#7d8aa0", brown:"#85542b", charcoal:"#36404a", forest:"#2f6b3a", gray:"#888", grey:"#888", green:"#3fa34d", lavender:"#b9a7e0", leather:"#9c6b3f", maroon:"#7a2233", navy:"#22325a", orange:"#e08a2e", pink:"#e88bb5", purple:"#8a4fbf", red:"#cc3b3b", rose:"#e0708a", sky:"#7fc6e6", slate:"#5a6b7a", tan:"#d2b48c", teal:"#2aa7a0", walnut:"#5b3a22", white:"#eee", yellow:"#e6c84d", steel:"#9fb0bf", iron:"#6a737d", ceramic:"#d9cbb8", brass:"#b5912f", bronze:"#a5702f", copper:"#b5723a", gold:"#ffcf4d", silver:"#c7ced6" };

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
  const ownedItems = ITEMS.filter((i) => owned.includes(i.key));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Personnage</h1>
        <span className="text-xs text-system-text/60">Collection : {ownedItems.length}/{ITEMS.length}</span>
      </div>
      <SystemPanel title="[ Aperçu ]"><div className="flex justify-center"><LpcAvatar equipped={equipped} size={240} /></div></SystemPanel>

      {EQUIP_SLOTS.map((slot) => {
        const list = ownedItems.filter((i) => i.slot === slot);
        const cur = equipped[slot];
        return (
          <SystemPanel key={slot} title={"[ " + SLOT_LABEL[slot] + " · " + list.length + " ]"}>
            <div className="flex flex-wrap items-start gap-2">
              <button onClick={() => equip(slot, null)} className={"rounded border px-2 py-1 text-xs " + (!cur ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/50")}>Aucun</button>
              {list.map((it) => (
                <div key={it.key} className="flex flex-col items-center gap-1">
                  <button onClick={() => equip(slot, it.key, it.colors?.[0]?.name)} className="rounded px-2 py-1 text-xs"
                    style={{ border: (cur?.key === it.key ? "2px solid " : "1px solid ") + RARITY_COLORS[it.rarity], color: RARITY_COLORS[it.rarity] }}>{it.name}</button>
                  {cur?.key === it.key && it.colors && it.colors.length > 1 && (
                    <div className="flex max-w-[160px] flex-wrap gap-1">
                      {it.colors.map((c) => (
                        <button key={c.name} onClick={() => equip(slot, it.key, c.name)} title={c.name}
                          className={"h-4 w-4 rounded-full border " + (cur?.color === c.name ? "border-white" : "border-transparent")}
                          style={{ backgroundColor: SW[c.name] || "#888" }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SystemPanel>
        );
      })}
      <p className="text-[11px] text-system-text/40">Complète des quêtes pour looter de nouvelles pièces (rares → légendaires).</p>
    </div>
  );
}
