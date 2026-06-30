"use client";
import { useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import { ATTRIBUTES } from "@/lib/game.config";
import { SUGGESTIONS } from "@/lib/suggestions";

type Custom = { title: string; baseXp: number; difficulty: string };
type DomState = { court: string; moyen: string; sel: number[]; custom: Custom[]; draft: string };

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [dom, setDom] = useState<Record<string, DomState>>(
    Object.fromEntries(ATTRIBUTES.map((a) => [a.code, { court: "", moyen: "", sel: [], custom: [], draft: "" }]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set(code: string, patch: Partial<DomState>) {
    setDom((d) => ({ ...d, [code]: { ...d[code], ...patch } }));
  }
  function toggleSel(code: string, i: number) {
    setDom((d) => {
      const sel = d[code].sel.includes(i) ? d[code].sel.filter((x) => x !== i) : [...d[code].sel, i];
      return { ...d, [code]: { ...d[code], sel } };
    });
  }
  function addCustom(code: string) {
    setDom((d) => {
      const t = d[code].draft.trim();
      if (!t) return d;
      return { ...d, [code]: { ...d[code], custom: [...d[code].custom, { title: t, baseXp: 50, difficulty: "E" }], draft: "" } };
    });
  }
  function removeCustom(code: string, i: number) {
    setDom((d) => ({ ...d, [code]: { ...d[code], custom: d[code].custom.filter((_, x) => x !== i) } }));
  }

  async function finish() {
    setSaving(true);
    const objectives: { attributeCode: string; horizon: string; title: string; quests?: Custom[] }[] = [];
    for (const a of ATTRIBUTES) {
      const d = dom[a.code];
      const quests: Custom[] = [
        ...d.sel.map((i) => (SUGGESTIONS[a.code] || [])[i]).filter(Boolean).map((t) => ({ title: t.title, baseXp: t.baseXp, difficulty: t.difficulty })),
        ...d.custom,
      ];
      const courtTitle = d.court.trim() || (quests.length > 0 ? "Objectif " + a.name : "");
      if (courtTitle) objectives.push({ attributeCode: a.code, horizon: "court", title: courtTitle, quests });
      if (d.moyen.trim()) objectives.push({ attributeCode: a.code, horizon: "moyen", title: d.moyen.trim() });
    }
    if (objectives.length === 0) { setMsg("Définis au moins un objectif ou une quête."); setSaving(false); return; }
    const r = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, objectives }) }).then((res) => res.json());
    if (r.ok) { window.location.href = "/"; } else { setMsg(r.error || "Erreur"); setSaving(false); }
  }

  const nbCourt = ATTRIBUTES.filter((a) => dom[a.code].court.trim() || dom[a.code].sel.length || dom[a.code].custom.length).length;

  return (
    <div className="space-y-4">
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Onboarding du Chasseur</h1>
      <p className="text-sm text-system-text/70">Définis tes objectifs <b>court terme</b> (ce mois) et <b>moyen terme</b> (3 mois) pour chaque domaine. Coche les quêtes suggérées et/ou ajoute les tiennes. Tu pourras tout ajuster ensuite.</p>

      <SystemPanel title="[ Ton Chasseur ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Nom</label>
        <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Ton nom de chasseur" value={name} onChange={(e) => setName(e.target.value)} />
      </SystemPanel>

      {ATTRIBUTES.map((a) => {
        const d = dom[a.code];
        const sug = SUGGESTIONS[a.code] || [];
        return (
          <SystemPanel key={a.code} title={"[ " + a.icon + " " + a.name + " ]"}>
            <label className="block text-xs uppercase tracking-widest text-system-text/60">Objectif court terme (ce mois)</label>
            <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Ex. Faire 12 séances de sport" value={d.court} onChange={(e) => set(a.code, { court: e.target.value })} />
            <label className="mt-3 block text-xs uppercase tracking-widest text-system-text/60">Objectif moyen terme (3 mois) — optionnel</label>
            <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Ex. Courir un 10 km" value={d.moyen} onChange={(e) => set(a.code, { moyen: e.target.value })} />

            {sug.length > 0 && (
              <>
                <p className="mt-3 text-xs uppercase tracking-widest text-system-text/60">Quêtes suggérées</p>
                <div className="mt-1 space-y-1">
                  {sug.map((t, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={d.sel.includes(i)} onChange={() => toggleSel(a.code, i)} />
                      <span>{t.title} <span className="text-[11px] text-system-text/40">· {t.baseXp} XP</span></span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <p className="mt-3 text-xs uppercase tracking-widest text-system-text/60">Tes propres quêtes</p>
            {d.custom.length > 0 && (
              <ul className="mt-1 space-y-1">
                {d.custom.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>• {c.title}</span>
                    <button onClick={() => removeCustom(a.code, i)} className="text-xs text-red-400/70 hover:text-red-400">retirer</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
                placeholder="Ajouter ta propre quête"
                value={d.draft}
                onChange={(e) => set(a.code, { draft: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(a.code); } }}
              />
              <button onClick={() => addCustom(a.code)} className="shrink-0 rounded border border-system-border px-3 py-2 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">+ Ajouter</button>
            </div>
          </SystemPanel>
        );
      })}

      {msg && <p className="text-center text-sm text-amber-300">{msg}</p>}
      <button onClick={finish} disabled={saving} className="w-full rounded border border-system-border bg-system-accent/10 px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/20 disabled:opacity-50">
        {saving ? "Initialisation du Système…" : "Terminer l'onboarding (" + nbCourt + " domaine(s) défini(s))"}
      </button>
    </div>
  );
}
