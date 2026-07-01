"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import LpcItemThumb from "@/components/LpcItemThumb";
import { RARITY_COLORS, RARITY_LABEL, SLOT_LABEL, EQUIP_SLOTS, type Rarity, type Slot } from "@/lib/lpc-items";
import { SELL_VALUE } from "@/lib/loot";
import { UPGRADE_MAX, upgradeCost } from "@/lib/effects";
import { CONSUMABLES, BUFF_FIELD } from "@/lib/consumables";
import { RUNE_LABEL, RUNE_ICON, EXO_MAX_PER_STAT, type RuneType } from "@/lib/forge";

type Reward = { id: string; title: string; cost: number; icon?: string; redeemedAt: string | null };
type Exo = { xpPct: number; goldPct: number; lootPct: number };
type Inv = { itemKey: string; qty: number; plus: number; exo?: Exo; name: string; slot: string; rarity: string; setName?: string | null; setColor?: string | null };
type Cosmetic = { key: string; name: string; slot: string; rarity: string; cost: number; owned: boolean };
type TempleItem = { key: string; name: string; slot: string; rarity: string; cost: number; owned: boolean };
type ShopTab = "eclats" | "temple" | "conso" | "atelier" | "recompenses";

const RARITY_ORDER: Record<string, number> = { mythique: 5, legendaire: 4, epique: 3, rare: 2, commun: 1, base: 0 };

export default function BoutiquePage() {
  const [tab, setTab] = useState<ShopTab>("atelier");
  const [gold, setGold] = useState(0);
  const [shards, setShards] = useState(0);
  const [mereons, setMereons] = useState(0);
  const [items, setItems] = useState<Inv[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [cons, setCons] = useState<Record<string, number>>({});
  const [buffs, setBuffs] = useState<Record<string, string>>({});
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [temple, setTemple] = useState<TempleItem[]>([]);
  const [runes, setRunes] = useState<Record<RuneType, number>>({ xp: 0, gold: 0, loot: 0 });
  const [forgeOpen, setForgeOpen] = useState<string | null>(null);
  const [atelierSlot, setAtelierSlot] = useState<Slot | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rarete" | "doublons" | "nom">("rarete");
  const [dupesOnly, setDupesOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [inv, rw, cs, cx, al, fg] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/rewards").then((r) => r.json()),
      fetch("/api/consumables").then((r) => r.json()),
      fetch("/api/cosmetics").then((r) => r.json()),
      fetch("/api/almanax").then((r) => r.json()).catch(() => null),
      fetch("/api/forge").then((r) => r.json()).catch(() => null),
    ]);
    setGold(cs.gold ?? inv.gold ?? 0);
    setShards(cx.shards ?? inv.shards ?? 0);
    setItems(inv.items ?? []);
    setRewards(rw.rewards ?? []);
    setCons(cs.consumables ?? {});
    setBuffs(cs.buffs ?? {});
    setCosmetics(cx.catalog ?? []);
    if (al && !al.error) { setMereons(al.mereons ?? 0); setTemple(al.temple ?? []); }
    if (fg && !fg.error) setRunes(fg.runes ?? { xp: 0, gold: 0, loot: 0 });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function post(url: string, body: Record<string, unknown>) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((res) => res.json());
  }
  async function buyCons(key: string) { const r = await post("/api/consumables", { key }); flash(r.ok ? "Acheté ✓" : (r.error || "Erreur")); load(); }
  async function useCons(key: string) { const r = await post("/api/consumables/use", { key }); flash(r.ok ? "Activé — 24 h !" : (r.error || "Erreur")); load(); }
  async function buyCosmetic(key: string) { const r = await post("/api/cosmetics", { key }); flash(r.ok ? "Débloqué ✦ — équipe-le dans Personnage" : (r.error || "Erreur")); load(); }
  async function buyTemple(key: string) { const r = await post("/api/almanax", { action: "buy", key }); flash(r.ok ? "Relique du Temple débloquée ❖" : (r.error || "Erreur")); load(); }
  async function sell(itemKey: string) { const r = await post("/api/inventory/sell", { itemKey }); flash(r.ok ? "Vendu : +" + r.value + " or" : (r.error || "Erreur")); load(); }
  async function upgrade(itemKey: string) { const r = await post("/api/inventory/upgrade", { itemKey }); flash(r.ok ? "Amélioré → +" + r.plus + " (-" + r.spent + " or)" : (r.error || "Erreur")); load(); }
  async function redeem(id: string) { const r = await post("/api/rewards/redeem", { id }); if (r.ok) { flash("Récompense débloquée 🎉"); } else flash(r.error || "Erreur"); load(); }
  async function forgeBreak(itemKey: string) { const r = await post("/api/forge", { action: "break", itemKey }); flash(r.ok ? "Brisé → +" + r.gained.count + " " + r.gained.label : (r.error || "Erreur")); load(); }
  async function forgeApply(itemKey: string, rune: RuneType) {
    const r = await post("/api/forge", { action: "apply", itemKey, rune });
    if (!r.ok) { flash(r.error || "Erreur"); return; }
    if (r.outcome === "success") flash("⚒️ SUCCÈS — +1% appliqué à l'objet !");
    else if (r.outcome === "neutral") flash("… La rune n'a pas pris, mais elle est intacte.");
    else flash("✕ Échec. La rune s'est brisée dans la Forge.");
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  const dupes = items.filter((i) => i.qty > 1).length;
  const TABS: [ShopTab, string, string][] = [
    ["atelier", "⚒️ Atelier", dupes > 0 ? String(dupes) : ""],
    ["eclats", "✦ Éclats", cosmetics.filter((c) => !c.owned && shards >= c.cost).length ? "!" : ""],
    ["temple", "❖ Temple", temple.filter((c) => !c.owned && mereons >= c.cost).length ? "!" : ""],
    ["conso", "🧪 Consommables", ""],
    ["recompenses", "🎁 Récompenses", rewards.filter((r) => !r.redeemedAt && gold >= r.cost).length ? "!" : ""],
  ];

  let inv = [...items];
  if (atelierSlot !== "all") inv = inv.filter((i) => i.slot === atelierSlot);
  if (dupesOnly) inv = inv.filter((i) => i.qty > 1);
  if (search.trim()) inv = inv.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));
  inv.sort((a, b) => {
    if (sortBy === "doublons") return (b.qty - a.qty) || (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
    if (sortBy === "nom") return a.name.localeCompare(b.name);
    return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0) || (b.qty - a.qty) || a.name.localeCompare(b.name);
  });
  const rewardsSorted = [...rewards].sort((a, b) => (a.redeemedAt ? 1 : 0) - (b.redeemedAt ? 1 : 0) || a.cost - b.cost);
  const now = Date.now();
  function buffLeft(key: string): number {
    const iso = buffs[BUFF_FIELD[key]];
    if (!iso) return 0;
    return Math.max(0, Math.round((new Date(iso).getTime() - now) / 3600000));
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 w-max max-w-[92vw] -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}

      {/* En-tête sticky : titre + monnaies toujours visibles */}
      <div className="sticky top-0 z-40 -mx-4 border-b border-system-border/30 bg-system-bg/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Boutique</h1>
          <div className="flex gap-2 text-sm">
            <span className="rounded border border-system-border/40 bg-black/30 px-2.5 py-1">🪙 <span className="text-system-accent">{gold}</span></span>
            <span className="rounded border border-system-border/40 bg-black/30 px-2.5 py-1">✦ <span style={{ color: "#b06bff" }}>{shards}</span></span>
            <span className="rounded border border-system-border/40 bg-black/30 px-2.5 py-1">❖ <span style={{ color: "#ffcf4d" }}>{mereons}</span></span>
          </div>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map(([k, label, badge]) => (
            <button key={k} onClick={() => setTab(k)} className={"relative shrink-0 rounded border px-3 py-1.5 text-xs uppercase tracking-widest " + (tab === k ? "border-system-accent bg-system-accent/10 text-system-accent" : "border-system-border/40 text-system-text/60 hover:text-system-accent")}>
              {label}
              {badge && <span className="ml-1.5 rounded bg-amber-400/20 px-1 text-[10px] text-amber-300">{badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === "eclats" && (
        <SystemPanel title="[ Boutique des Éclats ✦ ]">
          <p className="mb-3 text-xs text-system-text/40">Skins de prestige exclusifs : impossibles à obtenir en butin. Les Éclats se gagnent en donjon, passage de rang et records de semaine.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cosmetics.map((c) => {
              const col = RARITY_COLORS[c.rarity as Rarity];
              const afford = shards >= c.cost;
              return (
                <div key={c.key} className="shop-card flex flex-col items-center rounded-md border bg-black/25 p-3 text-center" style={{ borderColor: c.owned ? "rgba(95,114,133,0.35)" : col, "--glow": col + "55", opacity: c.owned ? 0.6 : 1 } as React.CSSProperties}>
                  <div className="rounded bg-black/40 p-1" style={{ border: "1px solid " + col + "66" }}><LpcItemThumb itemKey={c.key} size={84} /></div>
                  <p className="mt-2 text-sm font-bold" style={{ color: col }}>{c.name}{c.owned ? " ✓" : ""}</p>
                  <p className="text-[11px] text-system-text/50">{SLOT_LABEL[c.slot as Slot] || c.slot} · {RARITY_LABEL[c.rarity as Rarity] || c.rarity}</p>
                  <button onClick={() => buyCosmetic(c.key)} disabled={c.owned || !afford} className="mt-2 w-full rounded border px-2 py-1.5 text-xs uppercase tracking-widest disabled:opacity-30" style={{ borderColor: "#b06bff88", color: "#b06bff" }}>{c.owned ? "Possédé" : c.cost + " ✦"}</button>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      )}

      {tab === "temple" && (
        <SystemPanel title="[ Temple de l'Almanax ❖ ]">
          <p className="mb-3 text-xs text-system-text/40">Reliques exclusives payées en Méréons ❖ — gagnés uniquement via les offrandes quotidiennes et les Failles. La constance a son propre trésor.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {temple.map((c) => {
              const afford = mereons >= c.cost;
              return (
                <div key={c.key} className="shop-card flex flex-col items-center rounded-md border bg-black/25 p-3 text-center" style={{ borderColor: c.owned ? "rgba(95,114,133,0.35)" : "#ffcf4d", "--glow": "#ffcf4d44", opacity: c.owned ? 0.6 : 1 } as React.CSSProperties}>
                  <div className="rounded bg-black/40 p-1" style={{ border: "1px solid #ffcf4d55" }}><LpcItemThumb itemKey={c.key} size={84} /></div>
                  <p className="mt-2 text-sm font-bold" style={{ color: RARITY_COLORS[c.rarity as Rarity] }}>{c.name}{c.owned ? " ✓" : ""}</p>
                  <p className="text-[11px] text-system-text/50">{SLOT_LABEL[c.slot as Slot] || c.slot}</p>
                  <button onClick={() => buyTemple(c.key)} disabled={c.owned || !afford} className="mt-2 w-full rounded border px-2 py-1.5 text-xs uppercase tracking-widest disabled:opacity-30" style={{ borderColor: "#ffcf4d88", color: "#ffcf4d" }}>{c.owned ? "Possédé" : c.cost + " ❖"}</button>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      )}

      {tab === "conso" && (
        <SystemPanel title="[ Consommables ]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONSUMABLES.map((c) => {
              const owned = cons[c.key] || 0;
              const isBuff = c.kind === "buff";
              const left = isBuff ? buffLeft(c.key) : 0;
              return (
                <div key={c.key} className="shop-card rounded-md border border-system-border/40 bg-black/25 p-3" style={{ "--glow": "rgba(56,225,255,0.25)" } as React.CSSProperties}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{c.icon} {c.name}</p>
                      <p className="mt-0.5 text-xs text-system-text/50">{c.desc}</p>
                    </div>
                    <span className="shrink-0 rounded border border-system-border/30 bg-black/40 px-2 py-0.5 text-xs">×{owned}</span>
                  </div>
                  {isBuff && left > 0 && <p className="mt-1 text-xs text-emerald-400">Actif — encore {left} h</p>}
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => buyCons(c.key)} disabled={gold < c.price} className="flex-1 rounded border border-system-border px-2 py-1.5 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-30">Acheter · {c.price} 🪙</button>
                    {isBuff && owned > 0 && <button onClick={() => useCons(c.key)} className="flex-1 rounded border border-emerald-500/50 px-2 py-1.5 text-xs uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10">Utiliser</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      )}

      {tab === "atelier" && (
        <SystemPanel title="[ Atelier & Forge des Ombres ⚒️ ]">
          <div className="mb-3 flex flex-wrap gap-2 rounded border border-system-border/30 bg-black/25 p-2 text-sm">
            {(Object.keys(RUNE_LABEL) as RuneType[]).map((t) => (
              <span key={t} className="rounded border border-system-border/40 bg-black/30 px-2.5 py-1 text-xs">{RUNE_ICON[t]} {RUNE_LABEL[t]} <span className="text-system-accent">×{runes[t] || 0}</span></span>
            ))}
            <span className="self-center text-[11px] text-system-text/40">Briser un doublon → runes · Forger : 55% succès (+1%), 25% neutre, 20% brisée · max +{EXO_MAX_PER_STAT}%/stat</span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className="w-40 rounded border border-system-border/40 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system-accent" placeholder="🔍 Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="rounded border border-system-border/40 bg-black/40 px-2 py-1.5 text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="rarete">Tri : rareté</option>
              <option value="doublons">Tri : doublons</option>
              <option value="nom">Tri : nom</option>
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-system-text/70"><input type="checkbox" checked={dupesOnly} onChange={(e) => setDupesOnly(e.target.checked)} /> Doublons uniquement</label>
          </div>
          <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
            <button onClick={() => setAtelierSlot("all")} className={"shrink-0 rounded border px-2 py-1 text-xs uppercase tracking-widest " + (atelierSlot === "all" ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>Tout {items.length}</button>
            {EQUIP_SLOTS.map((slot) => {
              const nb = items.filter((i) => i.slot === slot).length;
              return <button key={slot} onClick={() => setAtelierSlot(slot)} className={"shrink-0 rounded border px-2 py-1 text-xs uppercase tracking-widest " + (atelierSlot === slot ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>{SLOT_LABEL[slot]} <span className="opacity-50">{nb}</span></button>;
            })}
          </div>

          {inv.length === 0 ? (
            <p className="text-sm text-system-text/60">Aucune pièce ne correspond à ces filtres.</p>
          ) : (
            <ul className="space-y-2">
              {inv.map((i) => {
                const hasDupe = i.qty > 1;
                const canUp = hasDupe && i.plus < UPGRADE_MAX;
                const col = RARITY_COLORS[i.rarity as Rarity];
                const exo = i.exo || { xpPct: 0, goldPct: 0, lootPct: 0 };
                const exoStr = [exo.xpPct ? "+" + exo.xpPct + "% XP" : "", exo.goldPct ? "+" + exo.goldPct + "% or" : "", exo.lootPct ? "+" + exo.lootPct + "% loot" : ""].filter(Boolean).join(" · ");
                const open = forgeOpen === i.itemKey;
                return (
                  <li key={i.itemKey} className="shop-card rounded-md border bg-black/25 p-2.5" style={{ borderColor: col + "55", "--glow": col + "33" } as React.CSSProperties}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="shrink-0 rounded bg-black/40" style={{ border: "1px solid " + col }}><LpcItemThumb itemKey={i.itemKey} size={52} /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold" style={{ color: col }}>{i.name}{i.plus > 0 ? " +" + i.plus : ""} <span className="font-normal text-xs text-system-text/50">×{i.qty}</span></p>
                          <p className="truncate text-xs text-system-text/50">{SLOT_LABEL[i.slot as Slot] || i.slot} · {RARITY_LABEL[i.rarity as Rarity] || i.rarity}{i.setName ? <span style={{ color: i.setColor || undefined }}> · {i.setName}</span> : ""}</p>
                          {exoStr && <p className="text-[11px]" style={{ color: "#ffcf4d" }}>⚒️ {exoStr}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button onClick={() => upgrade(i.itemKey)} disabled={!canUp} className="rounded border border-system-border px-2 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-30">{i.plus >= UPGRADE_MAX ? "Max" : "+1 · " + upgradeCost(i.plus) + "🪙"}</button>
                        <div className="flex gap-1">
                          <button onClick={() => sell(i.itemKey)} disabled={!hasDupe} className="flex-1 rounded border border-system-border/50 px-2 py-1 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10 disabled:opacity-30">💰 {SELL_VALUE[i.rarity] ?? 0}</button>
                          <button onClick={() => forgeBreak(i.itemKey)} disabled={!hasDupe} className="flex-1 rounded border border-system-border/50 px-2 py-1 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10 disabled:opacity-30">Briser</button>
                          <button onClick={() => setForgeOpen(open ? null : i.itemKey)} className={"flex-1 rounded border px-2 py-1 text-xs uppercase tracking-widest " + (open ? "border-amber-400 text-amber-300" : "border-amber-400/40 text-amber-300/80 hover:bg-amber-400/10")}>⚒️</button>
                        </div>
                      </div>
                    </div>
                    {open && (
                      <div className="mt-2 flex flex-wrap gap-1 rounded border border-amber-400/20 bg-black/30 p-2">
                        <span className="self-center text-[11px] text-system-text/50">Appliquer :</span>
                        {(Object.keys(RUNE_LABEL) as RuneType[]).map((t) => (
                          <button key={t} onClick={() => forgeApply(i.itemKey, t)} disabled={(runes[t] || 0) < 1} className="rounded border border-system-border/40 px-2 py-1 text-xs text-system-text/80 hover:border-amber-400/60 disabled:opacity-30">{RUNE_ICON[t]} {RUNE_LABEL[t]} ×{runes[t] || 0}</button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SystemPanel>
      )}

      {tab === "recompenses" && (
        <SystemPanel title="[ Récompenses réelles ]">
          <p className="mb-3 text-xs text-system-text/40">Ton or contre du vrai plaisir. C&apos;est la boucle qui compte : effort réel → or → récompense réelle.</p>
          {rewards.length === 0 ? (
            <p className="text-sm text-system-text/60">Aucune récompense. Crée-en dans l&apos;onglet ⚙ Configuration.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rewardsSorted.map((r) => {
                const afford = gold >= r.cost;
                const pct = Math.min(100, Math.round((gold / Math.max(1, r.cost)) * 100));
                return (
                  <div key={r.id} className={"shop-card rounded-md border border-system-border/40 bg-black/25 p-3 " + (r.redeemedAt ? "opacity-45" : "")} style={{ "--glow": "rgba(255,207,77,0.25)" } as React.CSSProperties}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{r.icon || "🎁"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{r.title}</p>
                        <p className="text-xs text-system-text/50">{r.cost} 🪙{r.redeemedAt ? " · déjà débloquée" : ""}</p>
                        {!r.redeemedAt && !afford && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/40"><div className="h-full bg-amber-400/70" style={{ width: pct + "%" }} /></div>
                        )}
                      </div>
                      <button onClick={() => redeem(r.id)} disabled={!afford || !!r.redeemedAt} className="shrink-0 rounded border border-system-border px-3 py-1.5 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-40">{r.redeemedAt ? "✓" : "Débloquer"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SystemPanel>
      )}
    </div>
  );
}
