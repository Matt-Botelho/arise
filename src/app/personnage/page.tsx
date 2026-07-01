"use client";
import { useEffect, useMemo, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcAvatar from "@/components/LpcAvatar";
import LpcItemThumb from "@/components/LpcItemThumb";
import { ITEMS, EQUIP_SLOTS, SLOT_LABEL, RARITY_COLORS, RARITY_LABEL, DEFAULT_EQUIPPED, type Equipped, type Slot, type Rarity } from "@/lib/lpc-items";

const SW: Record<string, string> = { black:"#222", blue:"#3b5bdb", bluegray:"#7d8aa0", brown:"#85542b", charcoal:"#36404a", forest:"#2f6b3a", gray:"#888", grey:"#888", green:"#3fa34d", lavender:"#b9a7e0", leather:"#9c6b3f", maroon:"#7a2233", navy:"#22325a", orange:"#e08a2e", pink:"#e88bb5", purple:"#8a4fbf", red:"#cc3b3b", rose:"#e0708a", sky:"#7fc6e6", slate:"#5a6b7a", tan:"#d2b48c", teal:"#2aa7a0", walnut:"#5b3a22", white:"#eee", yellow:"#e6c84d", steel:"#9fb0bf", iron:"#6a737d", ceramic:"#d9cbb8", brass:"#b5912f", bronze:"#a5702f", copper:"#b5723a", gold:"#ffcf4d", silver:"#c7ced6" };

type Bonuses = { xpPct: number; goldPct: number; lootPct: number };

export default function PersonnagePage() {
  const [equipped, setEquipped] = useState<Equipped>(DEFAULT_EQUIPPED);
  const [owned, setOwned] = useState<string[]>([]);
  const [plusByKey, setPlusByKey] = useState<Record<string, number>>({});
  const [bonuses, setBonuses] = useState<Bonuses>({ xpPct: 0, goldPct: 0, lootPct: 0 });
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<Slot>("weapon");
  const [hover, setHover] = useState<{ key: string; color?: string } | null>(null);

  async function load() {
    const d = await fetch("/api/character").then((r) => r.json());
    if (!d.error) { setEquipped(d.equipped || DEFAULT_EQUIPPED); setOwned(d.owned || []); setPlusByKey(d.plusByKey || {}); setBonuses(d.bonuses || { xpPct: 0, goldPct: 0, lootPct: 0 }); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function equip(slot: Slot, key: string | null, color?: string) {
    const sel = key ? { key, ...(color ? { color } : {}) } : null;
    setEquipped((e) => ({ ...e, [slot]: sel }));
    setHover(null);
    await fetch("/api/character/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, key, color }) });
    load();
  }

  const preview = useMemo<Equipped>(
    () => (hover ? { ...equipped, [activeSlot]: { key: hover.key, ...(hover.color ? { color: hover.color } : {}) } } : equipped),
    [equipped, hover, activeSlot]
  );

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const ownedItems = ITEMS.filter((i) => owned.includes(i.key));
  const list = ownedItems.filter((i) => i.slot === activeSlot);
  const cur = equipped[activeSlot];
  const curItem = cur?.key ? ITEMS.find((i) => i.key === cur.key) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Personnage</h1>
        <span className="text-xs text-system-text/60">Collection : {ownedItems.length}/{ITEMS.length}</span>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-[380px_minmax(0,1fr)]">
        {/* GAUCHE — personnage */}
        <div className="space-y-3 md:sticky md:top-2 md:self-start">
          <SystemPanel title="[ Aperçu ]">
            <div className="flex justify-center"><LpcAvatar equipped={preview} size={300} /></div>
            {hover && <p className="mt-1 text-center text-xs text-system-accent/80">Aperçu — clique pour équiper</p>}
          </SystemPanel>

          <SystemPanel title="[ Équipé ]">
            <ul className="space-y-1 text-xs">
              {EQUIP_SLOTS.map((slot) => {
                const sel = equipped[slot];
                const it = sel?.key ? ITEMS.find((x) => x.key === sel.key) : null;
                return (
                  <li key={slot} className="flex items-center justify-between gap-2">
                    <button onClick={() => setActiveSlot(slot)} className={"uppercase tracking-widest " + (slot === activeSlot ? "text-system-accent" : "text-system-text/50 hover:text-system-accent")}>{SLOT_LABEL[slot]}</button>
                    <span style={{ color: it ? RARITY_COLORS[it.rarity] : undefined }}>{it ? it.name : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </SystemPanel>

          <SystemPanel title="[ Bonus d'équipement ]">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded border border-system-border/30 bg-black/30 py-2"><div className="text-system-accent">+{bonuses.xpPct}%</div><div className="text-[11px] uppercase tracking-widest text-system-text/50">XP</div></div>
              <div className="rounded border border-system-border/30 bg-black/30 py-2"><div style={{ color: "#ffcf4d" }}>+{bonuses.goldPct}%</div><div className="text-[11px] uppercase tracking-widest text-system-text/50">Or</div></div>
              <div className="rounded border border-system-border/30 bg-black/30 py-2"><div style={{ color: "#b06bff" }}>+{bonuses.lootPct}%</div><div className="text-[11px] uppercase tracking-widest text-system-text/50">Loot</div></div>
            </div>
          </SystemPanel>
        </div>

        {/* DROITE — inventaire catégorisé */}
        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {EQUIP_SLOTS.map((slot) => {
              const nb = ownedItems.filter((i) => i.slot === slot).length;
              const active = slot === activeSlot;
              return (
                <button key={slot} onClick={() => { setActiveSlot(slot); setHover(null); }}
                  className={"shrink-0 rounded border px-3 py-2 text-xs uppercase tracking-widest " + (active ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60 hover:text-system-accent")}>
                  {SLOT_LABEL[slot]} <span className="opacity-50">{nb}</span>
                </button>
              );
            })}
          </div>

          <SystemPanel title={"[ " + SLOT_LABEL[activeSlot] + " ]"}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              <button onClick={() => equip(activeSlot, null)}
                className={"flex aspect-square flex-col items-center justify-center gap-1 rounded border text-[11px] " + (!cur ? "border-system-accent text-system-accent" : "border-system-border/30 text-system-text/40 hover:border-system-accent/50")}>
                <span className="text-lg leading-none">✕</span>Aucun
              </button>
              {list.map((it) => {
                const pl = plusByKey[it.key] || 0;
                const selected = cur?.key === it.key;
                const col = selected ? cur?.color : it.colors?.[0]?.name;
                return (
                  <button key={it.key}
                    onMouseEnter={() => setHover({ key: it.key, color: col })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => equip(it.slot as Slot, it.key, it.colors?.[0]?.name)}
                    className="relative flex flex-col items-center rounded border bg-black/30 p-1"
                    style={{ borderColor: selected ? RARITY_COLORS[it.rarity] : "rgba(31,111,235,0.25)", borderWidth: selected ? 2 : 1 }}>
                    <LpcItemThumb itemKey={it.key} color={col} size={62} />
                    <span className="mt-0.5 w-full truncate text-center text-[10px]" style={{ color: RARITY_COLORS[it.rarity] }}>{it.name}</span>
                    {pl > 0 && <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[10px] text-system-accent">+{pl}</span>}
                  </button>
                );
              })}
            </div>
            {list.length === 0 && <p className="mt-1 text-sm text-system-text/50">Aucune pièce ici. Loote-en en quêtes/donjons, ou débloque des skins via succès et Éclats.</p>}

            {curItem?.colors && curItem.colors.length > 1 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] uppercase tracking-widest text-system-text/50">Couleur — {curItem.name} ({RARITY_LABEL[curItem.rarity as Rarity]})</p>
                <div className="flex flex-wrap gap-1">
                  {curItem.colors.map((c) => (
                    <button key={c.name} title={c.name} onClick={() => equip(activeSlot, curItem.key, c.name)}
                      className={"h-6 w-6 rounded-full border-2 " + (cur?.color === c.name ? "border-white" : "border-transparent")}
                      style={{ backgroundColor: SW[c.name] || "#888" }} />
                  ))}
                </div>
              </div>
            )}
          </SystemPanel>
          <p className="text-xs text-system-text/40">Survole une pièce pour la voir sur ton personnage, clique pour l'équiper. Améliore tes pièces dans Boutique → Atelier.</p>
        </div>
      </div>
    </div>
  );
}
