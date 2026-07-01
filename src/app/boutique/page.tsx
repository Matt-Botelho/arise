"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcItemThumb from "@/components/LpcItemThumb";
import { RARITY_COLORS, RARITY_LABEL, SLOT_LABEL, EQUIP_SLOTS, type Rarity, type Slot } from "@/lib/lpc-items";
import { SELL_VALUE } from "@/lib/loot";
import { UPGRADE_MAX, upgradeCost } from "@/lib/effects";
import { CONSUMABLES, BUFF_FIELD } from "@/lib/consumables";

type Reward = { id: string; title: string; cost: number; icon?: string; redeemedAt: string | null };
type Inv = { itemKey: string; qty: number; plus: number; name: string; slot: string; rarity: string };
type Cosmetic = { key: string; name: string; slot: string; rarity: string; cost: number; owned: boolean };

export default function BoutiquePage() {
  const [gold, setGold] = useState(0);
  const [shards, setShards] = useState(0);
  const [items, setItems] = useState<Inv[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [cons, setCons] = useState<Record<string, number>>({});
  const [buffs, setBuffs] = useState<Record<string, string>>({});
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [atelierSlot, setAtelierSlot] = useState<Slot | "all">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [inv, rw, cs, cx] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/rewards").then((r) => r.json()),
      fetch("/api/consumables").then((r) => r.json()),
      fetch("/api/cosmetics").then((r) => r.json()),
    ]);
    setGold(cs.gold ?? inv.gold ?? 0);
    setShards(cx.shards ?? inv.shards ?? 0);
    setItems(inv.items ?? []);
    setRewards(rw.rewards ?? []);
    setCons(cs.consumables ?? {});
    setBuffs(cs.buffs ?? {});
    setCosmetics(cx.catalog ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function buyCons(key: string) {
    const r = await fetch("/api/consumables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).then((res) => res.json());
    flash(r.ok ? "Acheté ✓" : (r.error || "Erreur")); load();
  }
  async function useCons(key: string) {
    const r = await fetch("/api/consumables/use", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).then((res) => res.json());
    flash(r.ok ? "Activé — 24 h !" : (r.error || "Erreur")); load();
  }
  async function buyCosmetic(key: string) {
    const r = await fetch("/api/cosmetics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).then((res) => res.json());
    flash(r.ok ? "Débloqué ✦ — équipe-le dans Personnage" : (r.error || "Erreur")); load();
  }
  async function sell(itemKey: string) {
    const r = await fetch("/api/inventory/sell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemKey }) }).then((res) => res.json());
    flash(r.ok ? "Vendu : +" + r.value + " or" : (r.error || "Erreur")); load();
  }
  async function upgrade(itemKey: string) {
    const r = await fetch("/api/inventory/upgrade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemKey }) }).then((res) => res.json());
    flash(r.ok ? "Amélioré → +" + r.plus + " (-" + r.spent + " or)" : (r.error || "Erreur")); load();
  }
  async function redeem(id: string) {
    const r = await fetch("/api/rewards/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then((res) => res.json());
    if (r.ok) { flash("Récompense débloquée 🎉"); load(); } else flash(r.error || "Erreur");
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const invAll = [...items].sort((a, b) => (b.qty - a.qty) || a.name.localeCompare(b.name));
  const invSorted = atelierSlot === "all" ? invAll : invAll.filter((i) => i.slot === atelierSlot);
  const rewardsSorted = [...rewards].sort((a, b) => (a.redeemedAt ? 1 : 0) - (b.redeemedAt ? 1 : 0) || a.cost - b.cost);
  const now = Date.now();
  function buffLeft(key: string): number {
    const iso = buffs[BUFF_FIELD[key]];
    if (!iso) return 0;
    return Math.max(0, Math.round((new Date(iso).getTime() - now) / 3600000));
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Boutique</h1>
        <span className="text-sm">Or <span className="text-system-accent system-glow">{gold} 🪙</span> · Éclats <span className="system-glow" style={{ color: "#b06bff" }}>{shards} ✦</span></span>
      </div>

      <div className="cards">
        <SystemPanel title="[ Boutique des Éclats ✦ ]">
          <p className="mb-3 text-xs text-system-text/40">Skins de prestige exclusifs : impossibles à obtenir en butin. Débloque-les avec tes Éclats ✦, puis équipe-les dans Personnage.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cosmetics.map((c) => (
              <div key={c.key} className="flex flex-col items-center rounded border bg-black/20 p-2 text-center" style={{ borderColor: c.owned ? "rgba(31,111,235,0.25)" : RARITY_COLORS[c.rarity as Rarity] }}>
                <div className="rounded bg-black/40"><LpcItemThumb itemKey={c.key} size={72} /></div>
                <p className="mt-1 text-xs" style={{ color: RARITY_COLORS[c.rarity as Rarity] }}>{c.name}{c.owned ? " ✓" : ""}</p>
                <p className="text-[11px] text-system-text/50">{SLOT_LABEL[c.slot as Slot] || c.slot} · {RARITY_LABEL[c.rarity as Rarity] || c.rarity}</p>
                <button onClick={() => buyCosmetic(c.key)} disabled={c.owned || shards < c.cost} className="mt-2 w-full rounded border border-system-border px-2 py-1 text-xs uppercase tracking-widest hover:bg-system-accent/10 disabled:opacity-30" style={{ color: "#b06bff" }}>{c.owned ? "Possédé" : c.cost + " ✦"}</button>
              </div>
            ))}
          </div>
        </SystemPanel>

        <SystemPanel title="[ Consommables ]">
          <ul className="space-y-2">
            {CONSUMABLES.map((c) => {
              const owned = cons[c.key] || 0;
              const isBuff = c.kind === "buff";
              const left = isBuff ? buffLeft(c.key) : 0;
              return (
                <li key={c.key} className="flex items-center justify-between gap-2 border-b border-system-border/20 pb-2 last:border-0">
                  <div>
                    <p className="text-sm">{c.icon} {c.name} <span className="text-xs text-system-text/50">×{owned}{isBuff && left > 0 ? " · actif " + left + "h" : ""}</span></p>
                    <p className="text-xs text-system-text/50">{c.desc}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isBuff && owned > 0 && <button onClick={() => useCons(c.key)} className="rounded border border-system-border px-2 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Utiliser</button>}
                    <button onClick={() => buyCons(c.key)} disabled={gold < c.price} className="rounded border border-system-border/60 px-2 py-1 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10 disabled:opacity-30">{c.price} 🪙</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </SystemPanel>

        <SystemPanel title="[ Atelier — améliorer & vendre ]">
          <p className="mb-2 text-xs text-system-text/40">Améliorer (+N) augmente le bonus d'une pièce (consomme 1 doublon + or). Vendre convertit un doublon en or. Tu gardes toujours 1 exemplaire.</p>
          <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
            <button onClick={() => setAtelierSlot("all")} className={"shrink-0 rounded border px-2 py-1 text-xs uppercase tracking-widest " + (atelierSlot === "all" ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>Tout</button>
            {EQUIP_SLOTS.map((slot) => {
              const nb = invAll.filter((i) => i.slot === slot).length;
              return <button key={slot} onClick={() => setAtelierSlot(slot)} className={"shrink-0 rounded border px-2 py-1 text-xs uppercase tracking-widest " + (atelierSlot === slot ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>{SLOT_LABEL[slot]} <span className="opacity-50">{nb}</span></button>;
            })}
          </div>
          {invSorted.length === 0 ? (
            <p className="text-sm text-system-text/60">Aucune pièce dans cette catégorie.</p>
          ) : (
            <ul className="space-y-2">
              {invSorted.map((i) => {
                const hasDupe = i.qty > 1;
                const canUp = hasDupe && i.plus < UPGRADE_MAX;
                return (
                  <li key={i.itemKey} className="flex items-center justify-between gap-2 border-b border-system-border/20 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 rounded bg-black/30" style={{ border: "1px solid " + RARITY_COLORS[i.rarity as Rarity] }}><LpcItemThumb itemKey={i.itemKey} size={48} /></div>
                      <div>
                        <p className="text-sm" style={{ color: RARITY_COLORS[i.rarity as Rarity] }}>{i.name}{i.plus > 0 ? " +" + i.plus : ""} <span className="text-xs text-system-text/50">×{i.qty}</span></p>
                        <p className="text-xs text-system-text/50">{SLOT_LABEL[i.slot as Slot] || i.slot} · {RARITY_LABEL[i.rarity as Rarity] || i.rarity}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button onClick={() => upgrade(i.itemKey)} disabled={!canUp} className="rounded border border-system-border px-2 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-30">{i.plus >= UPGRADE_MAX ? "Max" : "Améliorer " + upgradeCost(i.plus) + "🪙"}</button>
                      <button onClick={() => sell(i.itemKey)} disabled={!hasDupe} className="rounded border border-system-border/50 px-2 py-1 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10 disabled:opacity-30">Vendre +{SELL_VALUE[i.rarity] ?? 0}🪙</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SystemPanel>

        <SystemPanel title="[ Récompenses réelles ]">
          {rewards.length === 0 ? (
            <p className="text-sm text-system-text/60">Aucune récompense. Crée-en dans l'onglet ⚙ Configuration.</p>
          ) : (
            <ul className="space-y-2">
              {rewardsSorted.map((r) => (
                <li key={r.id} className={"flex items-center justify-between gap-3 border-b border-system-border/20 pb-2 last:border-0 " + (r.redeemedAt ? "opacity-45" : "")}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{r.icon || "🎁"}</span>
                    <div>
                      <p className="text-sm">{r.title}</p>
                      <p className="text-xs text-system-text/50">{r.cost} 🪙{r.redeemedAt ? " · déjà débloquée" : ""}</p>
                    </div>
                  </div>
                  <button onClick={() => redeem(r.id)} disabled={gold < r.cost} className="shrink-0 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-40">Débloquer</button>
                </li>
              ))}
            </ul>
          )}
        </SystemPanel>
      </div>
    </div>
  );
}
