"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcAvatar from "@/components/LpcAvatar";
import { ITEMS, EQUIP_SLOTS, SLOT_LABEL, RARITY_COLORS, DEFAULT_EQUIPPED, type Equipped, type Slot } from "@/lib/lpc-items";

const SW: Record<string, string> = { black:"#222", blue:"#3b5bdb", bluegray:"#7d8aa0", brown:"#85542b", charcoal:"#36404a", forest:"#2f6b3a", gray:"#888", grey:"#888", green:"#3fa34d", lavender:"#b9a7e0", leather:"#9c6b3f", maroon:"#7a2233", navy:"#22325a", orange:"#e08a2e", pink:"#e88bb5", purple:"#8a4fbf", red:"#cc3b3b", rose:"#e0708a", sky:"#7fc6e6", slate:"#5a6b7a", tan:"#d2b48c", teal:"#2aa7a0", walnut:"#5b3a22", white:"#eee", yellow:"#e6c84d", steel:"#9fb0bf", iron:"#6a737d", ceramic:"#d9cbb8", brass:"#b5912f", bronze:"#a5702f", copper:"#b5723a", gold:"#ffcf4d", silver:"#c7ced6" };

type Bonuses = { xpPct: number; goldPct: number; lootPct: number };

export default function PersonnagePage() {
  const [equipped, setEquipped] = useState<Equipped>(DEFAULT_EQUIPPED);
  const [owned, setOwned] = useState<string[]>([]);
  const [plusByKey, setPlusByKey] = useState<Record<string, number>>({});
  const [bonuses, setBonuses] = useState<Bonuses>({ xpPct: 0, goldPct: 0, lootPct: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    const d = await fetch("/api/character").then((r) => r.json());
    if (!d.error) { setEquipped(d.equipped || DEFAULT_EQUIPPED); setOwned(d.owned || []); setPlusByKey(d.plusByKey || {}); setBonuses(d.bonuses || { xpPct: 0, goldPct: 0, lootPct: 0 }); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function equip(slot: Slot, key: string | null, color?: string) {
    const sel = key ? { key, ...(color ? { color } : {}) } : null;
    setEquipped((e) => ({ ...e, [slot]: sel }));
    await fetch("/api/character/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, key, color }) });
    load();
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

      <SystemPanel title="[ Bonus d'équipement ]">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded border border-system-border/30 bg-black/30 py-2"><div className="text-system-accent">+{bonuses.xpPct}%</div><div className="text-[10px] uppercase tracking-widest text-system-text/50">XP</div></div>
          <div className="rounded border border-system-border/30 bg-black/30 py-2"><div style={{ color: "#ffcf4d" }}>+{bonuses.goldPct}%</div><div className="text-[10px] uppercase tracking-widest text-system-text/50">Or</div></div>
          <div className="rounded border border-system-border/30 bg-black/30 py-2"><div style={{ color: "#b06bff" }}>+{bonuses.lootPct}%</div><div className="text-[10px] uppercase tracking-widest text-system-text/50">Loot</div></div>
        </div>
        <p className="mt-2 text-[11px] text-system-text/40">Arme/jambes/cheveux → XP · torse/pieds → or · casque/cape → loot. La rareté et l'amélioration (+N) augmentent le bonus.</p>
      </SystemPanel>

      {EQUIP_SLOTS.map((slot) => {
        const list = ownedItems.filter((i) => i.slot === slot);
        const cur = equipped[slot];
        return (
          <SystemPanel key={slot} title={"[ " + SLOT_LABEL[slot] + " · " + list.length + " ]"}>
            <div className="flex flex-wrap items-start gap-2">
              <button onClick={() => equip(slot, null)} className={"rounded border px-2 py-1 text-xs " + (!cur ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/50")}>Aucun</button>
              {list.map((it) => {
                const pl = plusByKey[it.key] || 0;
                return (
                  <div key={it.key} className="flex flex-col items-center gap-1">
                    <button onClick={() => equip(slot, it.key, it.colors?.[0]?.name)} className="rounded px-2 py-1 text-xs"
                      style={{ border: (cur?.key === it.key ? "2px solid " : "1px solid ") + RARITY_COLORS[it.rarity], color: RARITY_COLORS[it.rarity] }}>
                      {it.name}{pl > 0 ? " +" + pl : ""}
                    </button>
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
                );
              })}
            </div>
          </SystemPanel>
        );
      })}
      <p className="text-[11px] text-system-text/40">Complète des quêtes pour looter de nouvelles pièces. Améliore-les dans la Boutique → Atelier.</p>
    </div>
  );
}
