"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { RARITY_COLORS, RARITY_LABEL, SLOT_LABEL, type Rarity, type Slot } from "@/lib/lpc-items";
import { SELL_VALUE } from "@/lib/loot";

type Reward = { id: string; title: string; cost: number; redeemedAt: string | null };
type Inv = { itemKey: string; qty: number; name: string; slot: string; rarity: string };

export default function BoutiquePage() {
  const [gold, setGold] = useState(0);
  const [shards, setShards] = useState(0);
  const [items, setItems] = useState<Inv[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(100);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [inv, rw] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/rewards").then((r) => r.json()),
    ]);
    setGold(inv.gold ?? rw.gold ?? 0);
    setShards(inv.shards ?? 0);
    setItems(inv.items ?? []);
    setRewards(rw.rewards ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function sell(itemKey: string) {
    const r = await fetch("/api/inventory/sell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemKey }) }).then((res) => res.json());
    if (r.ok) { flash("Vendu : +" + r.value + " or"); load(); } else flash(r.error || "Erreur");
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

  const dupes = items.filter((i) => i.qty > 1);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}

      <SystemPanel title="[ Trésor ]">
        <p className="text-sm">Or : <span className="text-system-accent system-glow">{gold} 🪙</span> &nbsp;·&nbsp; Éclats : <span className="system-glow" style={{ color: "#b06bff" }}>{shards} ✦</span></p>
        <p className="mt-1 text-[11px] text-system-text/40">Les Éclats serviront à acheter des skins exclusifs (boutique cosmétique à venir).</p>
      </SystemPanel>

      <SystemPanel title="[ Atelier — vendre les doublons ]">
        {dupes.length === 0 ? (
          <p className="text-sm text-system-text/60">Aucun doublon. Les pièces en double (lootées une 2ᵉ fois) pourront être vendues ici contre de l'or.</p>
        ) : (
          <ul className="space-y-2">
            {dupes.map((i) => (
              <li key={i.itemKey} className="flex items-center justify-between gap-3 border-b border-system-border/20 pb-2 last:border-0">
                <div>
                  <p className="text-sm" style={{ color: RARITY_COLORS[i.rarity as Rarity] }}>{i.name} <span className="text-[11px] text-system-text/50">×{i.qty}</span></p>
                  <p className="text-[11px] text-system-text/50">{SLOT_LABEL[i.slot as Slot] || i.slot} · {RARITY_LABEL[i.rarity as Rarity] || i.rarity}</p>
                </div>
                <button onClick={() => sell(i.itemKey)} className="shrink-0 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">
                  Vendre +{SELL_VALUE[i.rarity] ?? 0} 🪙
                </button>
              </li>
            ))}
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
