"use client";
import { useMemo, useState } from "react";
import { ATTRIBUTES } from "@/lib/game.config";

const ATTR_KEYWORDS: Record<string, string[]> = {
  FOR: ["sport", "muscu", "musculation", "courir", "course", "run", "gym", "pompe", "fitness", "abdos", "vélo", "velo", "natation", "marche", "cardio", "renfo"],
  VIT: ["poids", "maigrir", "perdre", "kilo", "santé", "sante", "sommeil", "dormir", "manger", "aliment", "nutrition", "énergie", "energie", "eau", "hydrat", "cigarette", "alcool"],
  INT: ["lire", "lecture", "livre", "apprendre", "étud", "etud", "cours", "langue", "formation", "compétence", "competence", "code", "apprentissage", "révis", "revis"],
  VOL: ["méditation", "meditation", "discipline", "habitude", "arrêter", "arreter", "focus", "concentration", "procrastin", "volonté", "volonte", "routine", "journal"],
  FIN: ["argent", "épargne", "epargne", "économ", "econom", "budget", "dette", "investir", "revenu", "euros", "€", "facture"],
  FAM: ["famille", "amis", "ami", "couple", "proche", "enfant", "parent", "social", "relation", "appeler", "conjoint"],
  TRA: ["travail", "carrière", "carriere", "projet", "business", "boulot", "pro", "productiv", "client", "entreprise", "réunion", "reunion"],
  JAR: ["jardin", "potager", "plante", "planter", "arros", "nature", "fleur", "légume", "legume", "semis"],
  ART: ["dessin", "peinture", "musique", "guitare", "créa", "crea", "bricolage", "diy", "artisanat", "couture", "photo", "sculpt"],
};
function suggestAttribute(text: string): string {
  const t = text.toLowerCase();
  for (const a of ATTRIBUTES) { if ((ATTR_KEYWORDS[a.code] || []).some((k) => t.includes(k))) return a.code; }
  return "";
}
const inputCls = "w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent";
const label = "block text-xs uppercase tracking-widest text-system-text/60";
const chip = (on: boolean) => "flex-1 rounded border px-2 py-2 text-xs uppercase tracking-widest " + (on ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60");

export default function ObjectiveWizard({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [attr, setAttr] = useState(""); const [attrTouched, setAttrTouched] = useState(false);
  const [kind, setKind] = useState<"count" | "metric">("metric");
  const [count, setCount] = useState(12);
  const [unit, setUnit] = useState("kg"); const [startV, setStartV] = useState(0); const [targetV, setTargetV] = useState(0);
  const [chapter, setChapter] = useState("");
  const [shortTitle, setShortTitle] = useState(""); const [shortMode, setShortMode] = useState<"once" | "week" | "month">("week"); const [shortSteps, setShortSteps] = useState("");
  const [dungeon, setDungeon] = useState(""); const [dungeonSteps, setDungeonSteps] = useState("");
  const [rewardTitle, setRewardTitle] = useState(""); const [rewardCost, setRewardCost] = useState(400);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);

  const suggested = useMemo(() => suggestAttribute(title), [title]);
  const effAttr = attrTouched ? attr : (suggested || attr);
  const aName = (c: string) => { const a = ATTRIBUTES.find((x) => x.code === c); return a ? a.icon + " " + a.name : c; };

  async function createAll() {
    if (!title.trim()) { setMsg("Nomme ta Quête Principale."); return; }
    const code = effAttr || suggested || ATTRIBUTES[0].code;
    setBusy(true); setMsg(null);
    try {
      const pBody: Record<string, unknown> = { attributeCode: code, horizon: "long", title: title.trim(), kind };
      if (kind === "count") pBody.targetCount = count; else { pBody.metricUnit = unit; pBody.startValue = startV; pBody.targetValue = targetV; }
      const p = await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pBody) }).then((r) => r.json());
      if (!p.ok) { setMsg(p.error || "Erreur"); setBusy(false); return; }
      let parentForShort = p.objective.id;
      if (chapter.trim()) {
        const c = await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attributeCode: code, horizon: "moyen", title: chapter.trim(), kind: "count", parentId: p.objective.id }) }).then((r) => r.json());
        if (c.ok) parentForShort = c.objective.id;
      }
      if (shortTitle.trim()) {
        let steps = shortSteps.split("\n").map((s) => s.trim()).filter(Boolean);
        if (!steps.length) steps = [shortTitle.trim()];
        await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attributeCode: code, horizon: "court", title: shortTitle.trim(), kind: "checklist", recurrence: shortMode, steps, parentId: parentForShort }) });
      }
      const ds = dungeonSteps.split("\n").map((s) => s.trim()).filter(Boolean);
      if (dungeon.trim() && ds.length) {
        await fetch("/api/dungeons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: dungeon.trim(), steps: ds, rewardXp: 400, isRankUp: false, rank: "C", attributeCodes: [code] }) });
      }
      if (rewardTitle.trim()) await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: rewardTitle.trim(), cost: rewardCost, icon: "🏆" }) });
      setTitle(""); setAttr(""); setAttrTouched(false); setChapter(""); setShortTitle(""); setShortSteps(""); setDungeon(""); setDungeonSteps(""); setRewardTitle("");
      setMsg("✓ Aventure forgée ! Va la voir dans l'onglet Aventure.");
      onDone();
    } catch { setMsg("Erreur réseau"); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-system-text/60">Du flou au concret : décris ton grand objectif, l'Assistant forge la Quête Principale (long terme) puis son premier chapitre, sa première quête et l'épreuve finale.</p>

      <div>
        <label className={label}>1. Ta Quête Principale (6-12 mois)</label>
        <input className={"mt-1 " + inputCls} placeholder="Ex. Courir un semi-marathon · Épargner 5000 €" value={title} onChange={(e) => setTitle(e.target.value)} />
        {suggested && !attrTouched && <p className="mt-1 text-xs text-system-accent/80">Domaine suggéré : {aName(suggested)}</p>}
      </div>
      <div>
        <label className={label}>2. Domaine</label>
        <select className={"mt-1 " + inputCls} value={effAttr} onChange={(e) => { setAttr(e.target.value); setAttrTouched(true); }}>
          <option value="">— choisir —</option>
          {ATTRIBUTES.map((a) => <option key={a.code} value={a.code}>{a.icon} {a.name}</option>)}
        </select>
      </div>
      <div>
        <label className={label}>3. Mesure de la Quête Principale</label>
        <div className="mt-1 flex gap-2">
          <button onClick={() => setKind("metric")} className={chip(kind === "metric")}>Métrique (valeur)</button>
          <button onClick={() => setKind("count")} className={chip(kind === "count")}>Compteur (X fois)</button>
        </div>
        {kind === "metric" ? (
          <div className="mt-2 grid grid-cols-3 gap-2"><div><span className="text-xs text-system-text/60">Départ</span><input type="number" className={inputCls} value={startV} onChange={(e) => setStartV(parseFloat(e.target.value || "0"))} /></div><div><span className="text-xs text-system-text/60">Cible</span><input type="number" className={inputCls} value={targetV} onChange={(e) => setTargetV(parseFloat(e.target.value || "0"))} /></div><div><span className="text-xs text-system-text/60">Unité</span><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} /></div></div>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-sm"><span className="text-xs text-system-text/60">Nombre de fois</span><input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value || "1", 10)))} /></div>
        )}
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">4. Premier chapitre <span className="text-system-text/40">(moyen terme ≈ 3 mois, optionnel)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. Bâtir l'endurance de base" value={chapter} onChange={(e) => setChapter(e.target.value)} />
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">5. Première quête courte <span className="text-system-text/40">(optionnel)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. S'entraîner cette semaine" value={shortTitle} onChange={(e) => setShortTitle(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <button onClick={() => setShortMode("once")} className={chip(shortMode === "once")}>Checklist</button>
          <button onClick={() => setShortMode("week")} className={chip(shortMode === "week")}>Hebdo</button>
          <button onClick={() => setShortMode("month")} className={chip(shortMode === "month")}>Mensuel</button>
        </div>
        <textarea className={"mt-2 h-16 " + inputCls} placeholder={"Étapes (une par ligne)\nSéance 1\nSéance 2\nSéance 3"} value={shortSteps} onChange={(e) => setShortSteps(e.target.value)} />
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">6. Épreuve finale (donjon) <span className="text-system-text/40">(optionnel)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. Le semi-marathon — 21 km" value={dungeon} onChange={(e) => setDungeon(e.target.value)} />
        <textarea className={"mt-2 h-16 " + inputCls} placeholder={"Étape 1\nÉtape 2"} value={dungeonSteps} onChange={(e) => setDungeonSteps(e.target.value)} />
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">Récompense finale <span className="text-system-text/40">(optionnel)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. Un week-end pour fêter ça" value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} />
        <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">Coût (or)</span><input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={rewardCost} onChange={(e) => setRewardCost(parseInt(e.target.value || "1", 10))} /></div>
      </div>

      {msg && <p className="text-sm text-system-accent">{msg}</p>}
      <button onClick={createAll} disabled={busy} className="w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-40">{busy ? "Forge en cours…" : "⚡ Forger l'aventure"}</button>
    </div>
  );
}
