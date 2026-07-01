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
  for (const a of ATTRIBUTES) { const kws = ATTR_KEYWORDS[a.code] || []; if (kws.some((k) => t.includes(k))) return a.code; }
  return "";
}

const inputCls = "w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent";
const label = "block text-xs uppercase tracking-widest text-system-text/60";

export default function ObjectiveWizard({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [attr, setAttr] = useState("");
  const [attrTouched, setAttrTouched] = useState(false);
  const [horizon, setHorizon] = useState("moyen");
  const [kind, setKind] = useState<"count" | "metric">("count");
  const [count, setCount] = useState(12);
  const [unit, setUnit] = useState("kg");
  const [startV, setStartV] = useState(0);
  const [targetV, setTargetV] = useState(0);
  const [questTitle, setQuestTitle] = useState("");
  const [questXp, setQuestXp] = useState(50);
  const [dungeonTitle, setDungeonTitle] = useState("");
  const [dungeonSteps, setDungeonSteps] = useState("");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardCost, setRewardCost] = useState(300);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const suggested = useMemo(() => suggestAttribute(title), [title]);
  const effAttr = attrTouched ? attr : (suggested || attr);
  const aName = (c: string) => { const a = ATTRIBUTES.find((x) => x.code === c); return a ? a.icon + " " + a.name : c; };

  async function createAll() {
    if (!title.trim()) { setMsg("Donne un titre à l'objectif."); return; }
    const code = effAttr || suggested || ATTRIBUTES[0].code;
    setBusy(true); setMsg(null);
    try {
      const body: Record<string, unknown> = { attributeCode: code, horizon, title: title.trim(), kind };
      if (kind === "count") body.targetCount = count;
      else { body.metricUnit = unit; body.startValue = startV; body.targetValue = targetV; }
      const o = await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      if (!o.ok) { setMsg(o.error || "Erreur objectif"); setBusy(false); return; }
      const objId = o.objective.id;
      if (questTitle.trim()) {
        await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: questTitle.trim(), attributeCodes: [code], baseXp: questXp, difficulty: "E", objectiveId: objId }) });
      }
      const steps = dungeonSteps.split("\n").map((s) => s.trim()).filter(Boolean);
      if (dungeonTitle.trim() && steps.length) {
        await fetch("/api/dungeons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: dungeonTitle.trim(), steps, rewardXp: 400, isRankUp: false, rank: "C", attributeCodes: [code] }) });
      }
      if (rewardTitle.trim()) {
        await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: rewardTitle.trim(), cost: rewardCost, icon: "🏆" }) });
      }
      setTitle(""); setAttr(""); setAttrTouched(false); setCount(12); setStartV(0); setTargetV(0); setQuestTitle(""); setDungeonTitle(""); setDungeonSteps(""); setRewardTitle("");
      setMsg("✓ Créé ! Retrouve-le dans Objectifs / Quêtes / Donjons.");
      onDone();
    } catch { setMsg("Erreur réseau"); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-system-text/60">Réponds aux questions : l'assistant transforme un objectif flou en objectif mesurable, et crée pour toi la quête, le donjon-jalon et la récompense.</p>

      <div>
        <label className={label}>1. Ton objectif, en une phrase</label>
        <input className={"mt-1 " + inputCls} placeholder="Ex. Perdre du poids · Épargner pour un voyage · Courir 10 km" value={title} onChange={(e) => setTitle(e.target.value)} />
        {suggested && !attrTouched && <p className="mt-1 text-xs text-system-accent/80">Domaine suggéré : {aName(suggested)}</p>}
      </div>

      <div>
        <label className={label}>2. Domaine (attribut)</label>
        <select className={"mt-1 " + inputCls} value={effAttr} onChange={(e) => { setAttr(e.target.value); setAttrTouched(true); }}>
          <option value="">— choisir —</option>
          {ATTRIBUTES.map((a) => <option key={a.code} value={a.code}>{a.icon} {a.name}</option>)}
        </select>
      </div>

      <div>
        <label className={label}>3. Comment le mesurer ?</label>
        <div className="mt-1 flex gap-2">
          <button onClick={() => setKind("count")} className={"flex-1 rounded border px-3 py-2 text-xs uppercase tracking-widest " + (kind === "count" ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>Compteur (X fois)</button>
          <button onClick={() => setKind("metric")} className={"flex-1 rounded border px-3 py-2 text-xs uppercase tracking-widest " + (kind === "metric" ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60")}>Métrique (valeur)</button>
        </div>
        {kind === "count" ? (
          <div className="mt-2 flex items-center gap-2 text-sm"><span className="text-xs text-system-text/60">Nombre de fois à réaliser</span><input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value || "1", 10)))} /></div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div><span className="text-xs text-system-text/60">Départ</span><input type="number" className={inputCls} value={startV} onChange={(e) => setStartV(parseFloat(e.target.value || "0"))} /></div>
            <div><span className="text-xs text-system-text/60">Cible</span><input type="number" className={inputCls} value={targetV} onChange={(e) => setTargetV(parseFloat(e.target.value || "0"))} /></div>
            <div><span className="text-xs text-system-text/60">Unité</span><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          </div>
        )}
      </div>

      <div>
        <label className={label}>4. Échéance</label>
        <select className={"mt-1 " + inputCls} value={horizon} onChange={(e) => setHorizon(e.target.value)}>
          <option value="court">Court terme (≈1 mois)</option>
          <option value="moyen">Moyen terme (≈3 mois)</option>
        </select>
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">5. Le geste quotidien qui y mène <span className="text-system-text/40">(optionnel)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. Courir 30 min · Virer 10 € · Lire 20 min" value={questTitle} onChange={(e) => setQuestTitle(e.target.value)} />
        <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">XP par validation</span><input type="number" min={1} className="w-20 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={questXp} onChange={(e) => setQuestXp(parseInt(e.target.value || "1", 10))} /></div>
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">Un donjon-jalon <span className="text-system-text/40">(optionnel — la grande épreuve)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. Épreuve : 10 km chrono" value={dungeonTitle} onChange={(e) => setDungeonTitle(e.target.value)} />
        <textarea className={"mt-2 h-20 " + inputCls} placeholder={"Étape 1\nÉtape 2"} value={dungeonSteps} onChange={(e) => setDungeonSteps(e.target.value)} />
      </div>

      <div className="rounded border border-system-border/20 p-3">
        <p className="text-xs uppercase tracking-widest text-system-accent/80">Une récompense réelle <span className="text-system-text/40">(optionnel)</span></p>
        <input className={"mt-2 " + inputCls} placeholder="Ex. Nouvelle paire de chaussures" value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} />
        <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">Coût (or)</span><input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={rewardCost} onChange={(e) => setRewardCost(parseInt(e.target.value || "1", 10))} /></div>
      </div>

      {msg && <p className="text-sm text-system-accent">{msg}</p>}
      <button onClick={createAll} disabled={busy} className="w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-40">{busy ? "Création…" : "⚡ Créer l'objectif complet"}</button>
    </div>
  );
}
