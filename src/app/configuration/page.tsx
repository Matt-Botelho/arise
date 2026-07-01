"use client";
import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";
import ObjectiveWizard from "@/components/ObjectiveWizard";
import { ATTRIBUTES } from "@/lib/game.config";
import { SUGGESTIONS } from "@/lib/suggestions";
import { setSfxEnabled, playLevelUp } from "@/lib/sfx";
import { HEALTH_METRICS, METRIC_BY_KEY } from "@/lib/health";

type Settings = { name: string; penaltyIntensity: string; dayRolloverHour: number; timezone: string; dayTheme: Record<string, string>; sfxEnabled: boolean; gatePool?: string[] };
type HealthLatest = Record<string, { value: number; date: string; unit: string }>;
type Quest = { id: string; title: string; attributeCodes: string[]; baseXp: number; difficulty: string; isMandatory: boolean; type?: string };
type Step = { label: string; done: boolean };
type Weekly = { id: string; title: string; steps: Step[]; attributeCodes: string[]; baseXp: number; status: string };
type OQ = { id: string; title: string; baseXp: number; difficulty: string };
type Obj = { id: string; parentId: string | null; attributeCode: string; horizon: string; title: string; status: string; progress: number; targetCount: number; kind: string; recurrence: string; steps: { label: string; done: boolean }[] | null; metricUnit: string | null; startValue: number | null; targetValue: number | null; currentValue: number | null; metricKey?: string | null; quests: OQ[] };
type Dungeon = { id: string; title: string; rank: string; steps: Step[]; isRankUp: boolean; targetRank: string | null };
type Reward = { id: string; title: string; cost: number; icon?: string };
type HInfo = { rank: string; nextRank: string | null };

const CODES = ATTRIBUTES.map((a) => a.code);
const NAME: Record<string, string> = Object.fromEntries(ATTRIBUTES.map((a) => [a.code, a.icon + " " + a.name]));
const WEEKDAYS: { k: string; label: string }[] = [
  { k: "1", label: "Lundi" }, { k: "2", label: "Mardi" }, { k: "3", label: "Mercredi" },
  { k: "4", label: "Jeudi" }, { k: "5", label: "Vendredi" }, { k: "6", label: "Samedi" }, { k: "0", label: "Dimanche" },
];
const REWARD_EMOJIS = ["🎁","🎮","🍿","🧋","🍕","🍫","🍺","🎬","📚","🎧","🛍️","💆","🏖️","⚽","🎨","☕"];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
function groupByAttr<T>(items: T[], code: (t: T) => string): [string, T[]][] {
  const map: Record<string, T[]> = {};
  for (const it of items) (map[code(it) || "—"] ||= []).push(it);
  const out: [string, T[]][] = [];
  for (const a of ATTRIBUTES) if (map[a.code]?.length) out.push([a.code, map[a.code]]);
  if (map["—"]?.length) out.push(["—", map["—"]]);
  return out;
}

const inputCls = "w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent";
const btnCls = "rounded border border-system-border px-3 py-2 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10";
const chip = (on: boolean) => "rounded border px-2 py-1 text-xs " + (on ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60");

export default function ConfigurationPage() {
  const [tab, setTab] = useState<"assistant" | "quetes" | "objectifs" | "donjons" | "recompenses" | "integrations" | "reglages">("assistant");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [quests, setQuests] = useState<Quest[]>([]);
  const [weeklies, setWeeklies] = useState<Weekly[]>([]);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [hinfo, setHinfo] = useState<HInfo | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [notif, setNotif] = useState("");

  const [qTitle, setQTitle] = useState(""); const [qCodes, setQCodes] = useState<string[]>([]); const [qDiff, setQDiff] = useState("E"); const [qXp, setQXp] = useState(50); const [qMand, setQMand] = useState(false);
  const [wTitle, setWTitle] = useState(""); const [wSteps, setWSteps] = useState(""); const [wCodes, setWCodes] = useState<string[]>([]); const [wXp, setWXp] = useState(400);
  const [oCode, setOCode] = useState(CODES[0]); const [oHorizon, setOHorizon] = useState("court"); const [oTitle, setOTitle] = useState(""); const [oTarget, setOTarget] = useState(10);
  const [oKind, setOKind] = useState<"count" | "metric" | "checklist">("count"); const [oUnit, setOUnit] = useState("kg"); const [oStart, setOStart] = useState(0); const [oTargetV, setOTargetV] = useState(0);
  const [oParent, setOParent] = useState(""); const [oRecur, setORecur] = useState<"once" | "week" | "month">("once"); const [oSteps, setOSteps] = useState("");
  const [openAdd, setOpenAdd] = useState<string | null>(null); const [customQ, setCustomQ] = useState("");
  const [dTitle, setDTitle] = useState(""); const [dRankUp, setDRankUp] = useState(true); const [dRank, setDRank] = useState("D"); const [dSteps, setDSteps] = useState(""); const [dCodes, setDCodes] = useState<string[]>([]); const [dReward, setDReward] = useState(400);
  const [rTitle, setRTitle] = useState(""); const [rCost, setRCost] = useState(100); const [rIcon, setRIcon] = useState("🎁");
  const [health, setHealth] = useState<HealthLatest>({}); const [healthCount, setHealthCount] = useState(0);
  const [aTitle, setATitle] = useState(""); const [aMetric, setAMetric] = useState("steps"); const [aThreshold, setAThreshold] = useState(8000); const [aCodes, setACodes] = useState<string[]>([]); const [aXp, setAXp] = useState(50); const [aMand, setAMand] = useState(false);
  const [gatePoolText, setGatePoolText] = useState("");

  async function load() {
    const [q, w, o, d, rw, st, stt, he] = await Promise.all([
      fetch("/api/quests").then((r) => r.json()),
      fetch("/api/weeklies").then((r) => r.json()),
      fetch("/api/objectives").then((r) => r.json()),
      fetch("/api/dungeons").then((r) => r.json()),
      fetch("/api/rewards").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/integrations/health").then((r) => r.json()).catch(() => null),
    ]);
    setQuests((q.quests || []).filter((x: Quest) => x.type !== "rankup"));
    setWeeklies(w.weeklies || []);
    setObjs(o.objectives || []);
    setDungeons(d.dungeons || []);
    setRewards(rw.rewards || []);
    if (he && !he.error) { setHealth(he.latest || {}); setHealthCount(he.count || 0); }
    if (!st.error) { setS(st); setSfxEnabled(st.sfxEnabled !== false); setGatePoolText((st.gatePool || []).join("\n")); }
    if (!stt.error) setHinfo({ rank: stt.hunter.rank, nextRank: stt.hunter.nextRank });
    if (typeof window !== "undefined" && "Notification" in window) setNotif(Notification.permission);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }
  const toggle = (arr: string[], set: (v: string[]) => void, c: string) => set(arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]);

  async function createQuest() {
    if (!qTitle.trim()) return;
    const r = await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: qTitle, attributeCodes: qCodes, difficulty: qDiff, baseXp: qXp, isMandatory: qMand }) }).then((x) => x.json());
    if (r.ok) { setQTitle(""); setQCodes([]); setQXp(50); setQMand(false); flash("Quête créée ✓"); load(); } else flash(r.error || "Erreur");
  }
  async function delQuest(id: string) { await fetch("/api/quests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  async function createWeekly() {
    const steps = wSteps.split("\n").map((x) => x.trim()).filter(Boolean);
    if (!wTitle.trim() || !steps.length) { flash("Titre + au moins une étape."); return; }
    const r = await fetch("/api/weeklies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: wTitle, steps, attributeCodes: wCodes, baseXp: wXp }) }).then((x) => x.json());
    if (r.ok) { setWTitle(""); setWSteps(""); setWCodes([]); setWXp(400); flash("Mission hebdo créée ✓"); load(); } else flash(r.error || "Erreur");
  }
  async function delWeekly(id: string) { await fetch("/api/weeklies", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  async function createObj() {
    if (!oTitle.trim()) return;
    const body: Record<string, unknown> = { attributeCode: oCode, horizon: oHorizon, title: oTitle, kind: oKind, parentId: oParent || null };
    if (oKind === "count") body.targetCount = oTarget;
    else if (oKind === "metric") { body.metricUnit = oUnit; body.startValue = oStart; body.targetValue = oTargetV; }
    else { body.recurrence = oRecur; body.steps = oSteps.split("\n").map((x) => x.trim()).filter(Boolean); }
    const r = await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
    if (r.ok) { setOTitle(""); setOTarget(10); setOStart(0); setOTargetV(0); setOSteps(""); flash("Objectif créé ✓"); load(); } else flash(r.error || "Erreur");
  }
  async function delObj(id: string) { await fetch("/api/objectives", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }
  async function setTarget(o: Obj, n: number) { if (n < 1) return; await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, targetCount: n }) }); load(); }
  async function toggleObjDone(o: Obj) { await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, status: o.status === "done" ? "active" : "done" }) }); load(); }
  async function addQuest(o: Obj, t: { title: string; baseXp?: number; difficulty?: string }) {
    await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t.title, attributeCodes: [o.attributeCode], baseXp: t.baseXp || 50, difficulty: t.difficulty || "E", objectiveId: o.id }) });
    setCustomQ(""); load();
  }
  async function delAttached(id: string) { await fetch("/api/quests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  async function createDungeon() {
    const steps = dSteps.split("\n").map((x) => x.trim()).filter(Boolean);
    if (!dTitle.trim() || !steps.length) { flash("Titre + au moins une étape."); return; }
    const r = await fetch("/api/dungeons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: dTitle, steps, rewardXp: dReward, isRankUp: dRankUp, rank: dRankUp ? undefined : dRank, attributeCodes: dRankUp ? [] : dCodes }) }).then((x) => x.json());
    if (r.ok) { setDTitle(""); setDSteps(""); setDCodes([]); setDReward(400); flash("Donjon créé ✓"); load(); } else flash(r.error || "Erreur");
  }
  async function delDungeon(id: string) { await fetch("/api/dungeons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  async function createReward() {
    if (!rTitle.trim()) return;
    const r = await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: rTitle, cost: rCost, icon: rIcon }) }).then((x) => x.json());
    if (r.ok) { setRTitle(""); setRCost(100); setRIcon("🎁"); flash("Récompense créée ✓"); load(); } else flash(r.error || "Erreur");
  }
  async function delReward(id: string) { await fetch("/api/rewards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  async function saveSettings() {
    if (!s) return;
    const gatePool = gatePoolText.split("\n").map((x) => x.trim()).filter(Boolean);
    const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, gatePool }) }).then((x) => x.json());
    flash(r.ok ? "Réglages enregistrés ✓" : (r.error || "Erreur"));
  }
  async function createAutoQuest() {
    if (!aTitle.trim()) return;
    const r = await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: aTitle, attributeCodes: aCodes, baseXp: aXp, isMandatory: aMand, metricKey: aMetric, threshold: aThreshold }) }).then((x) => x.json());
    if (r.ok) { setATitle(""); setACodes([]); setAXp(50); setAMand(false); flash("Quête auto créée ✓ — le Système la validera tout seul"); load(); } else flash(r.error || "Erreur");
  }
  async function linkObjMetric(id: string, metricKey: string) {
    await fetch("/api/objectives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, metricKey: metricKey || null }) });
    flash(metricKey ? "Objectif lié à Apple Santé ✓" : "Lien retiré"); load();
  }
  async function enableNotifs() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) { flash("Notifications non supportées ici"); return; }
      const perm = await Notification.requestPermission(); setNotif(perm);
      if (perm !== "granted") { flash("Permission refusée"); return; }
      const keyRes = await fetch("/api/push/public-key").then((r) => r.json());
      if (!keyRes.key) { flash("VAPID non configuré côté serveur"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyRes.key) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) }).then((x) => x.json());
      flash(r.ok ? "Notifications activées ✅" : "Erreur d'abonnement");
    } catch (e) { flash("Erreur : " + String(e)); }
  }
  async function testNotif() { const r = await fetch("/api/push/test", { method: "POST" }).then((x) => x.json()); flash(r.error ? r.error : "Envoyé à " + (r.sent ?? 0) + " appareil(s)"); }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement…</p>;
  const TABS: [typeof tab, string][] = [["assistant", "✨ Assistant"], ["quetes", "Quêtes & Hebdo"], ["objectifs", "Objectifs"], ["donjons", "Donjons"], ["recompenses", "Récompenses"], ["integrations", "📡 Intégrations"], ["reglages", "Réglages"]];
  const questGroups = groupByAttr(quests, (q) => q.attributeCodes[0] || "");
  const weeklyGroups = groupByAttr(weeklies, (w) => w.attributeCodes[0] || "");

  return (
    <div className="space-y-4">
      {toast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">[Système] {toast}</div>}
      <div>
        <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">⚙ Configuration</h1>
        <p className="text-xs text-system-text/50">Les coulisses du Système : conçois tes quêtes, objectifs, donjons et récompenses. Les autres onglets restent 100% « jeu ».</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={"rounded border px-3 py-2 text-xs uppercase tracking-widest " + (tab === k ? "border-system-accent text-system-accent" : "border-system-border/40 text-system-text/60 hover:text-system-accent")}>{label}</button>
        ))}
      </div>

      {tab === "assistant" && (
        <SystemPanel title="[ ✨ Assistant d'objectif ]"><ObjectiveWizard onDone={load} /></SystemPanel>
      )}

      {tab === "quetes" && (
        <div className="cards">
          <SystemPanel title="[ Nouvelle quête journalière ]">
            <input className={inputCls} placeholder="Ex. 30 min de lecture" value={qTitle} onChange={(e) => setQTitle(e.target.value)} />
            <p className="mt-2 text-xs uppercase tracking-widest text-system-text/60">Attributs</p>
            <div className="mt-1 flex flex-wrap gap-1">{CODES.map((c) => <button key={c} onClick={() => toggle(qCodes, setQCodes, c)} className={chip(qCodes.includes(c))}>{c}</button>)}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-system-text/60">Diff.</span>
              <select className="rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={qDiff} onChange={(e) => setQDiff(e.target.value)}>{["E","D","C","B","A","S"].map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <span className="text-xs text-system-text/60">XP</span>
              <input type="number" min={1} className="w-20 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={qXp} onChange={(e) => setQXp(parseInt(e.target.value || "1", 10))} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={qMand} onChange={(e) => setQMand(e.target.checked)} /> Obligatoire</label>
            </div>
            <button onClick={createQuest} className={"mt-3 w-full " + btnCls}>Créer la quête</button>
          </SystemPanel>

          <SystemPanel title={"[ Quêtes journalières · " + quests.length + " ]"}>
            {quests.length === 0 ? <p className="text-sm text-system-text/60">Aucune quête.</p> : questGroups.map(([code, list]) => (
              <div key={code} className="mb-3 last:mb-0">
                <p className="mb-1 text-xs uppercase tracking-widest text-system-accent/70">{code === "—" ? "Sans domaine" : NAME[code]}</p>
                <ul className="space-y-1">
                  {list.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-2 border-b border-system-border/15 pb-1 last:border-0">
                      <span className="text-sm">{q.isMandatory ? "★ " : ""}{q.title} <span className="text-xs text-system-text/40">{q.difficulty} · {q.baseXp}XP{q.type === "auto" ? " · AUTO" : ""}</span></span>
                      <button onClick={() => delQuest(q.id)} className="shrink-0 text-xs text-red-400/70 hover:text-red-400">✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SystemPanel>

          <SystemPanel title="[ Nouvelle mission hebdomadaire ]">
            <input className={inputCls} placeholder="Titre (ex. 4 séances de sport)" value={wTitle} onChange={(e) => setWTitle(e.target.value)} />
            <textarea className={"mt-2 h-24 " + inputCls} placeholder={"Étape 1\nÉtape 2\nÉtape 3"} value={wSteps} onChange={(e) => setWSteps(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1">{CODES.map((c) => <button key={c} onClick={() => toggle(wCodes, setWCodes, c)} className={chip(wCodes.includes(c))}>{c}</button>)}</div>
            <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">XP</span><input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={wXp} onChange={(e) => setWXp(parseInt(e.target.value || "1", 10))} /></div>
            <button onClick={createWeekly} className={"mt-3 w-full " + btnCls}>Créer la mission</button>
          </SystemPanel>

          <SystemPanel title={"[ Missions hebdo · " + weeklies.length + " ]"}>
            {weeklies.length === 0 ? <p className="text-sm text-system-text/60">Aucune mission.</p> : weeklyGroups.map(([code, list]) => (
              <div key={code} className="mb-3 last:mb-0">
                <p className="mb-1 text-xs uppercase tracking-widest text-system-accent/70">{code === "—" ? "Sans domaine" : NAME[code]}</p>
                <ul className="space-y-1">
                  {list.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 border-b border-system-border/15 pb-1 last:border-0">
                      <span className="text-sm">{w.title} <span className="text-xs text-system-text/40">{w.steps.length} étapes · {w.baseXp}XP</span></span>
                      <button onClick={() => delWeekly(w.id)} className="shrink-0 text-xs text-red-400/70 hover:text-red-400">✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SystemPanel>
        </div>
      )}

      {tab === "objectifs" && (
        <div className="cards">
          <SystemPanel title="[ Nouvel objectif ]">
            <label className="block text-xs uppercase tracking-widest text-system-text/60">Rattacher à (parent)</label>
            <select className={"mt-1 " + inputCls} value={oParent} onChange={(e) => setOParent(e.target.value)}>
              <option value="">— aucun (racine / Quête Principale) —</option>
              {objs.map((p) => <option key={p.id} value={p.id}>{(p.horizon === "long" ? "◆ " : p.horizon === "moyen" ? "▸ " : "· ") + p.title}</option>)}
            </select>
            <div className="mt-2 flex flex-wrap gap-2">
              <select className="rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={oCode} onChange={(e) => setOCode(e.target.value)}>{ATTRIBUTES.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</select>
              <select className="rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={oHorizon} onChange={(e) => setOHorizon(e.target.value)}><option value="long">Long terme (Principale)</option><option value="moyen">Moyen terme (Chapitre)</option><option value="court">Court terme (Quête)</option></select>
            </div>
            <input className={"mt-2 " + inputCls} placeholder="Intitulé" value={oTitle} onChange={(e) => setOTitle(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setOKind("count")} className={"flex-1 " + chip(oKind === "count")}>Compteur</button>
              <button onClick={() => setOKind("metric")} className={"flex-1 " + chip(oKind === "metric")}>Métrique</button>
              <button onClick={() => setOKind("checklist")} className={"flex-1 " + chip(oKind === "checklist")}>Checklist</button>
            </div>
            {oKind === "count" && (
              <label className="mt-2 flex items-center gap-1 text-xs text-system-text/60">Cible (nb de fois) <input type="number" min={1} className="w-16 rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={oTarget} onChange={(e) => setOTarget(Math.max(1, parseInt(e.target.value || "1", 10)))} /></label>
            )}
            {oKind === "metric" && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-system-text/60">
                <label>Départ<input type="number" className={inputCls} value={oStart} onChange={(e) => setOStart(parseFloat(e.target.value || "0"))} /></label>
                <label>Cible<input type="number" className={inputCls} value={oTargetV} onChange={(e) => setOTargetV(parseFloat(e.target.value || "0"))} /></label>
                <label>Unité<input className={inputCls} value={oUnit} onChange={(e) => setOUnit(e.target.value)} /></label>
              </div>
            )}
            {oKind === "checklist" && (
              <div className="mt-2">
                <div className="flex items-center gap-2"><span className="text-xs text-system-text/60">Récurrence</span>
                  <select className="rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={oRecur} onChange={(e) => setORecur(e.target.value as "once" | "week" | "month")}><option value="once">Une fois</option><option value="week">Hebdo</option><option value="month">Mensuel</option></select>
                </div>
                <textarea className={"mt-2 h-20 " + inputCls} placeholder={"Étape 1\nÉtape 2\nÉtape 3"} value={oSteps} onChange={(e) => setOSteps(e.target.value)} />
              </div>
            )}
            <button onClick={createObj} className={"mt-2 w-full " + btnCls}>Ajouter</button>
          </SystemPanel>

          {objs.map((o) => {
            const a = ATTRIBUTES.find((x) => x.code === o.attributeCode);
            const sug = SUGGESTIONS[o.attributeCode] || [];
            const metric = o.kind === "metric";
            const parent = o.parentId ? objs.find((p) => p.id === o.parentId) : null;
            return (
              <SystemPanel key={o.id} title={"[ " + (a ? a.icon + " " + a.name : o.attributeCode) + " ]"}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={"text-sm font-bold " + (o.status === "done" ? "text-emerald-400 line-through" : "")}>{(o.horizon === "long" ? "◆ " : o.horizon === "moyen" ? "▸ " : "") + o.title}</p>
                    <p className="text-xs text-system-text/50">{o.horizon === "long" ? "Principale" : o.horizon === "moyen" ? "Chapitre" : "Quête"}{parent ? " · ↳ " + parent.title : ""} · {o.kind === "metric" ? (o.currentValue ?? o.startValue ?? 0) + " → " + (o.targetValue ?? 0) + " " + (o.metricUnit || "") : o.kind === "checklist" ? "checklist" + (o.recurrence !== "once" ? " " + o.recurrence : "") : o.progress + "/" + o.targetCount}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {o.kind === "count" && <><button onClick={() => setTarget(o, o.targetCount - 1)} className="rounded border border-system-border/40 px-1.5 text-sm hover:border-system-accent">−</button><button onClick={() => setTarget(o, o.targetCount + 1)} className="rounded border border-system-border/40 px-1.5 text-sm hover:border-system-accent">+</button></>}
                    <button onClick={() => toggleObjDone(o)} className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10">✓</button>
                    <button onClick={() => delObj(o.id)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">✕</button>
                  </div>
                </div>
                {o.quests.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {o.quests.map((q) => <li key={q.id} className="flex items-center justify-between text-sm"><span>• {q.title}</span><button onClick={() => delAttached(q.id)} className="text-xs text-red-400/70 hover:text-red-400">retirer</button></li>)}
                  </ul>
                )}
                <button onClick={() => setOpenAdd(openAdd === o.id ? null : o.id)} className="mt-2 text-xs uppercase tracking-widest text-system-accent hover:underline">+ quête liée</button>
                {openAdd === o.id && (
                  <div className="mt-2 rounded border border-system-border/20 p-2">
                    <div className="flex flex-wrap gap-1">{sug.map((t, i) => <button key={i} onClick={() => addQuest(o, t)} className="rounded border border-system-border/40 px-2 py-1 text-xs text-system-text/70 hover:border-system-accent hover:text-system-accent">+ {t.title}</button>)}</div>
                    <div className="mt-2 flex gap-2">
                      <input className="flex-1 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" placeholder="Quête personnalisée" value={customQ} onChange={(e) => setCustomQ(e.target.value)} />
                      <button onClick={() => customQ.trim() && addQuest(o, { title: customQ.trim() })} className="rounded border border-system-border px-2 py-1 text-xs text-system-accent">Ajouter</button>
                    </div>
                  </div>
                )}
              </SystemPanel>
            );
          })}
        </div>
      )}

      {tab === "donjons" && (
        <div className="cards">
          <SystemPanel title="[ Nouveau donjon ]">
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={dRankUp} onChange={(e) => setDRankUp(e.target.checked)} /><span>Donjon de passage de rang{hinfo?.nextRank ? " (" + hinfo.rank + " → " + hinfo.nextRank + ")" : ""}</span></label>
            <input className={"mt-3 " + inputCls} placeholder={dRankUp ? "Ex. Épreuve du passage de rang" : "Ex. Courir un 10 km"} value={dTitle} onChange={(e) => setDTitle(e.target.value)} />
            {!dRankUp && (
              <>
                <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">Rang</span><select className="rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={dRank} onChange={(e) => setDRank(e.target.value)}>{["E","D","C","B","A","S"].map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="mt-2 flex flex-wrap gap-1">{CODES.map((c) => <button key={c} onClick={() => toggle(dCodes, setDCodes, c)} className={chip(dCodes.includes(c))}>{c}</button>)}</div>
              </>
            )}
            <textarea className={"mt-2 h-24 " + inputCls} placeholder={"Étape 1\nÉtape 2"} value={dSteps} onChange={(e) => setDSteps(e.target.value)} />
            <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">Or</span><input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={dReward} onChange={(e) => setDReward(parseInt(e.target.value || "1", 10))} /></div>
            <button onClick={createDungeon} className={"mt-3 w-full " + btnCls}>Créer le donjon</button>
          </SystemPanel>

          <SystemPanel title={"[ Donjons · " + dungeons.length + " ]"}>
            {dungeons.length === 0 ? <p className="text-sm text-system-text/60">Aucun donjon.</p> : (
              <ul className="space-y-1">
                {dungeons.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 border-b border-system-border/15 pb-1 last:border-0">
                    <span className="text-sm">{d.isRankUp ? "⩘ " : ""}{d.title} <span className="text-xs text-system-text/40">{d.isRankUp ? "passage de rang" : "rang " + d.rank} · {d.steps.length} étapes</span></span>
                    <button onClick={() => delDungeon(d.id)} className="shrink-0 text-xs text-red-400/70 hover:text-red-400">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </SystemPanel>
        </div>
      )}

      {tab === "recompenses" && (
        <div className="cards">
          <SystemPanel title="[ Nouvelle récompense réelle ]">
            <p className="text-xs uppercase tracking-widest text-system-text/60">Icône</p>
            <div className="mt-1 flex flex-wrap gap-1">{REWARD_EMOJIS.map((em) => <button key={em} onClick={() => setRIcon(em)} className={"rounded border px-2 py-1 text-lg " + (rIcon === em ? "border-system-accent bg-system-accent/10" : "border-system-border/30 hover:border-system-accent/50")}>{em}</button>)}</div>
            <input className={"mt-3 " + inputCls} placeholder="Ex. Soirée film, boba…" value={rTitle} onChange={(e) => setRTitle(e.target.value)} />
            <div className="mt-2 flex items-center gap-2"><span className="text-xs text-system-text/60">Coût (or)</span><input type="number" min={1} className="w-28 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={rCost} onChange={(e) => setRCost(parseInt(e.target.value || "1", 10))} /></div>
            <button onClick={createReward} className={"mt-3 w-full " + btnCls}>Créer la récompense</button>
          </SystemPanel>

          <SystemPanel title={"[ Récompenses · " + rewards.length + " ]"}>
            {rewards.length === 0 ? <p className="text-sm text-system-text/60">Aucune récompense.</p> : (
              <ul className="space-y-1">
                {rewards.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 border-b border-system-border/15 pb-1 last:border-0">
                    <span className="text-sm">{r.icon || "🎁"} {r.title} <span className="text-xs text-system-text/40">{r.cost}🪙</span></span>
                    <button onClick={() => delReward(r.id)} className="shrink-0 text-xs text-red-400/70 hover:text-red-400">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </SystemPanel>
        </div>
      )}

      {tab === "integrations" && (
        <div className="cards">
          <SystemPanel title="[ 📡 Apple Santé — le pont ]">
            <p className="text-xs text-system-text/60">Apple Santé est ton hub : ta balance, ton app calories et ton iPhone y écrivent tout. Installe l&apos;app <span className="text-system-accent">Health Auto Export</span> (iOS), crée une automation <span className="text-system-accent">REST API</span> avec :</p>
            <ul className="mt-2 space-y-1 text-xs text-system-text/70">
              <li>• URL : <code className="rounded bg-black/40 px-1 py-0.5 text-system-accent">https://TON-DOMAINE/api/integrations/health</code></li>
              <li>• Header : <code className="rounded bg-black/40 px-1 py-0.5 text-system-accent">x-system-secret: TON_SECRET</code> (le même que le cron)</li>
              <li>• Format : JSON · métriques : pas, calories, poids, sommeil… (toutes reconnues sont stockées)</li>
              <li>• Fréquence : toutes les heures (l&apos;export ne tourne que téléphone déverrouillé — normal, limite iOS)</li>
            </ul>
            <div className="mt-3 border-t border-system-border/20 pt-2">
              <p className="mb-1 text-xs uppercase tracking-widest text-system-text/50">Dernières données reçues {healthCount > 0 ? "(" + healthCount + " échantillons)" : ""}</p>
              {Object.keys(health).length === 0 ? (
                <p className="text-sm text-system-text/60">Rien reçu pour l&apos;instant. Le Système attend ton premier battement.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {Object.entries(health).map(([k, v]) => {
                    const def = METRIC_BY_KEY[k];
                    return (
                      <div key={k} className="rounded border border-system-border/30 bg-black/20 p-2 text-center">
                        <p className="text-sm text-system-accent">{def?.icon} {Math.round(v.value * 10) / 10} <span className="text-xs text-system-text/50">{def?.unit || v.unit}</span></p>
                        <p className="text-[10px] text-system-text/50">{def?.label || k} · {v.date}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SystemPanel>

          <SystemPanel title="[ Nouvelle quête AUTO ]">
            <p className="mb-2 text-xs text-system-text/40">Validée automatiquement quand la métrique atteint le seuil. Push : « Le Système a détecté… ». Zéro friction.</p>
            <input className={inputCls} placeholder="Ex. Marcher 8 000 pas" value={aTitle} onChange={(e) => setATitle(e.target.value)} />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <select className="rounded border border-system-border/40 bg-black/40 px-2 py-2 text-sm outline-none" value={aMetric} onChange={(e) => setAMetric(e.target.value)}>
                {HEALTH_METRICS.map((m) => <option key={m.key} value={m.key}>{m.icon} {m.label} ({m.unit})</option>)}
              </select>
              <span className="text-xs text-system-text/60">Seuil ≥</span>
              <input type="number" min={1} className="w-24 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={aThreshold} onChange={(e) => setAThreshold(parseFloat(e.target.value || "1"))} />
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-system-text/60">Attributs</p>
            <div className="mt-1 flex flex-wrap gap-1">{CODES.map((c) => <button key={c} onClick={() => toggle(aCodes, setACodes, c)} className={chip(aCodes.includes(c))}>{c}</button>)}</div>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="text-xs text-system-text/60">XP</span>
              <input type="number" min={1} className="w-20 rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={aXp} onChange={(e) => setAXp(parseInt(e.target.value || "1", 10))} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={aMand} onChange={(e) => setAMand(e.target.checked)} /> Obligatoire</label>
            </div>
            <button onClick={createAutoQuest} className={"mt-3 w-full " + btnCls}>Créer la quête auto</button>
          </SystemPanel>

          <SystemPanel title="[ Objectifs métriques liés ]">
            <p className="mb-2 text-xs text-system-text/40">Lie un objectif métrique (poids, etc.) à Apple Santé : sa valeur courante se met à jour toute seule à chaque pesée / synchro.</p>
            {objs.filter((o) => o.kind === "metric" && o.status === "active").length === 0 ? (
              <p className="text-sm text-system-text/60">Aucun objectif métrique actif. Crée-en un dans l&apos;onglet Objectifs.</p>
            ) : (
              <ul className="space-y-2">
                {objs.filter((o) => o.kind === "metric" && o.status === "active").map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{o.title} <span className="text-xs text-system-text/50">{(o.currentValue ?? o.startValue ?? 0)} → {o.targetValue} {o.metricUnit}</span></span>
                    <select className="rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none" value={o.metricKey || ""} onChange={(e) => linkObjMetric(o.id, e.target.value)}>
                      <option value="">— manuel —</option>
                      {HEALTH_METRICS.map((m) => <option key={m.key} value={m.key}>{m.icon} {m.label}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </SystemPanel>
        </div>
      )}

      {tab === "reglages" && s && (
        <div className="cards">
          <SystemPanel title="[ Notifications ]">
            <p className="text-xs text-system-text/60">État : {notif || "inconnu"}</p>
            <div className="mt-3 flex gap-2"><button onClick={enableNotifs} className={"flex-1 " + btnCls}>Activer</button><button onClick={testNotif} className="flex-1 rounded border border-system-border/50 px-3 py-2 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10">Tester</button></div>
            <p className="mt-2 text-xs text-system-text/40">Sur iPhone : ajoute d'abord l'app à l'écran d'accueil, puis active.</p>
          </SystemPanel>

          <SystemPanel title="[ Chasseur ]">
            <label className="block text-xs uppercase tracking-widest text-system-text/60">Nom</label>
            <input className={"mt-1 " + inputCls} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
          </SystemPanel>

          <SystemPanel title="[ Pénalités & journée ]">
            <label className="block text-xs uppercase tracking-widest text-system-text/60">Intensité (quête obligatoire ratée)</label>
            <select className={"mt-1 " + inputCls} value={s.penaltyIntensity} onChange={(e) => setS({ ...s, penaltyIntensity: e.target.value })}>
              <option value="off">Off — aucune pénalité</option>
              <option value="douce">Douce — léger malus, reset de série</option>
              <option value="fidele">Fidèle — perte de PV/XP (recommandé)</option>
              <option value="hardcore">Hardcore — grosse perte de PV/XP</option>
            </select>
            <label className="mt-4 block text-xs uppercase tracking-widest text-system-text/60">Heure de bascule (0-23)</label>
            <input type="number" min={0} max={23} className={"mt-1 " + inputCls} value={s.dayRolloverHour} onChange={(e) => setS({ ...s, dayRolloverHour: parseInt(e.target.value || "0", 10) })} />
            <label className="mt-4 block text-xs uppercase tracking-widest text-system-text/60">Fuseau horaire</label>
            <input className={"mt-1 " + inputCls} value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} />
          </SystemPanel>

          <SystemPanel title="[ Thème du jour ]">
            <p className="mb-2 text-xs text-system-text/40">L'attribut mis en avant chaque jour dans l'onglet Quêtes.</p>
            <div className="space-y-2">
              {WEEKDAYS.map((d) => (
                <label key={d.k} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-system-text/70">{d.label}</span>
                  <select className="rounded border border-system-border/40 bg-black/40 px-2 py-1 text-sm outline-none focus:border-system-accent" value={s.dayTheme?.[d.k] || ""} onChange={(e) => setS({ ...s, dayTheme: { ...s.dayTheme, [d.k]: e.target.value } })}>{ATTRIBUTES.map((a) => <option key={a.code} value={a.code}>{a.icon} {a.name}</option>)}</select>
                </label>
              ))}
            </div>
          </SystemPanel>

          <SystemPanel title="[ ⛩ Pool des Portes ]">
            <p className="mb-2 text-xs text-system-text/40">Micro-épreuves surprises : chaque matin, 1 chance sur 3 qu&apos;une Porte s&apos;ouvre avec l&apos;une d&apos;elles (une par ligne). Vide = pool par défaut.</p>
            <textarea className={"h-32 " + inputCls} placeholder={"10 pompes bonus\n15 min de lecture en plus\nRanger un tiroir"} value={gatePoolText} onChange={(e) => setGatePoolText(e.target.value)} />
          </SystemPanel>

          <SystemPanel title="[ Sons & animations ]">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.sfxEnabled} onChange={(e) => { setS({ ...s, sfxEnabled: e.target.checked }); setSfxEnabled(e.target.checked); }} /> Activer les sons et effets</label>
            <button onClick={() => playLevelUp()} className="mt-3 rounded border border-system-border/50 px-3 py-2 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10">Tester le son</button>
          </SystemPanel>

          <div><button onClick={saveSettings} className={"w-full py-3 text-sm " + btnCls}>Enregistrer les réglages</button></div>
        </div>
      )}
    </div>
  );
}
