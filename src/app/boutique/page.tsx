"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { RARITY_COLORS, RARITY_LABEL, SLOT_LABEL, type Rarity, type Slot } from "@/lib/lpc-items";
import { SELL_VALUE } from "@/lib/loot";
import { UPGRADE_MAX, upgradeCost } from "@/lib/effects";
import { CONSUMABLES, BUFF_FIELD } from "@/lib/consumables";

type Reward = { id: string; title: string; cost: number; redeemedAt: string | null };
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
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(100);
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
  async function add() {
    if (!title.trim()) return;
    const r = await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, cost }) }).then((res) => res.json());
    if (r.ok) { setTitle(""); setCost(100); load(); } else flash(r.error || "Erreur");
  }
  async function redeem(id: string) {
    const r = await fetch("/api/rewards/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then((res) => res.json());
    if (r.ok) { flash("Récompense débloquée 🎉"); load(); } else flash(r.error || "Erreur");
  }
  async function del(id: string) {
    await fetch("/api/rewards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const invSorted = [...items].sort((a, b) => (b.qty - a.qty) || a.name.localeCompare(b.name));
  const now = Date.now();
  function buffLeft(key: string): number {
    const iso = buffs[BUFF_FIELD[key]];
    if (!iso) return 0;
    return Math.max(0, Math.round((new Date(iso).getTime() - now) / 3600000));
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}

      <SystemPanel title="[ Trésor ]">
        <p className="text-sm">Or : <span className="text-system-accent system-glow">{gold} 🪙</span> &nbsp;·&nbsp; Éclats : <span className="system-glow" style={{ color: "#b06bff" }}>{shards} ✦</span></p>
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
                  <p className="text-sm">{c.icon} {c.name} <span className="text-[11px] text-system-text/50">×{owned}{isBuff && left > 0 ? " · actif " + left + "h" : ""}</span></p>
                  <p className="text-[11px] text-system-text/50">{c.desc}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {isBuff && owned > 0 && <button onClick={() => useCons(c.key)} className="rounded border border-system-border px-2 py-1 text-[11px] uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Utiliser</button>}
                  <button onClick={() => buyCons(c.key)} disabled={gold < c.price} className="rounded border border-system-border/60 px-2 py-1 text-[11px] uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10 disabled:opacity-30">{c.price} 🪙</button>
                </div>
              </li>
            );
          })}
        </ul>
      </SystemPanel>

      <SystemPanel title="[ Boutique des Éclats ✦ ]">
        <p className="mb-2 text-[11px] text-system-text/40">Skins de prestige exclusifs : impossibles à obtenir en butin. Les Éclats ✦ (gagnés en donjon et au passage de rang) sont le seul moyen de les débloquer. Une fois acheté, équipe-le depuis Personnage.</p>
        <ul className="space-y-2">
          {cosmetics.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-2 border-b border-system-border/20 pb-2 last:border-0">
              <div>
                <p className="text-sm" style={{ color: RARITY_COLORS[c.rarity as Rarity] }}>{c.name}{c.owned ? " ✓" : ""}</p>
                <p className="text-[11px] text-system-text/50">{SLOT_LABEL[c.slot as Slot] || c.slot} · {RARITY_LABEL[c.rarity as Rarity] || c.rarity}</p>
              </div>
              <button onClick={() => buyCosmetic(c.key)} disabled={c.owned || shards < c.cost} className="shrink-0 rounded border border-system-border px-3 py-1 text-[11px] uppercase tracking-widest hover:bg-system-accent/10 disabled:opacity-30" style={{ color: "#b06bff" }}>{c.owned ? "Possédé" : c.cost + " ✦"}</button>
            </li>
          ))}
        </ul>
      </SystemPanel>

      <SystemPanel title="[ Atelier — améliorer & vendre ]">
        <p className="mb-2 text-[11px] text-system-text/40">Améliorer (+N) augmente le bonus d'une pièce (consomme 1 doublon + or). Vendre convertit un doublon en or. Tu gardes toujours 1 exemplaire.</p>
        {invSorted.length === 0 ? (
          <p className="text-sm text-system-text/60">Inventaire vide.</p>
        ) : (
          <ul className="space-y-2">
            {invSorted.map((i) => {
              const hasDupe = i.qty > 1;
              const canUp = hasDupe && i.plus < UPGRADE_MAX;
              return (
                <li key={i.itemKey} className="flex items-center justify-between gap-2 border-b border-system-border/20 pb-2 last:border-0">
                  <div>
                    <p className="text-sm" style={{ color: RARITY_COLORS[i.rarity as Rarity] }}>{i.name}{i.plus > 0 ? " +" + i.plus : ""} <span className="text-[11px] text-system-text/50">×{i.qty}</span></p>
                    <p className="text-[11px] text-system-text/50">{SLOT_LABEL[i.slot as Slot] || i.slot} · {RARITY_LABEL[i.rarity as Rarity] || i.rarity}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => upgrade(i.itemKey)} disabled={!canUp} className="rounded border border-system-border px-2 py-1 text-[11px] uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-30">{i.plus >= UPGRADE_MAX ? "Max" : "Améliorer " + upgradeCost(i.plus) + "🪙"}</button>
                    <button onClick={() => sell(i.itemKey)} disabled={!hasDupe} className="rounded border border-system-border/50 px-2 py-1 text-[11px] uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10 disabled:opacity-30">Vendre +{SELL_VALUE[i.rarity] ?? 0}🪙</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SystemPanel>

      <SystemPanel title="[ Récompenses réelles ]">
        {rewards.length === 0 ? (
          <p className="text-sm text-system-text/60">Aucune récompense. Crée-en une ci-dessous (un vrai plaisir à t'offrir avec ton or).</p>
        ) : (
          <ul className="space-y-2">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-system-border/20 pb-2 last:border-0">
                <div>
                  <p className="text-sm">{r.title}</p>
                  <p className="text-[11px] text-system-text/50">{r.cost} 🪙{r.redeemedAt ? " · déjà débloquée" : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => redeem(r.id)} disabled={gold < r.cost} className="shrink-0 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-40">Débloquer</button>
                  <button onClick={() => del(r.id)} className="shrink-0 rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SystemPanel>

      <SystemPanel title="[ Nouvelle récompense réelle ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Intitulé</label>
        <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Ex. Soirée film, boba, nouveau jeu…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Coût (or)</label>
        <input type="number" min={1} className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" value={cost} onChange={(e) => setCost(parseInt(e.target.value || "1", 10))} />
        <button onClick={add} className="mt-4 w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10">Ajouter</button>
      </SystemPanel>
    </div>
  );
}
