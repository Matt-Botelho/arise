"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";

type Quest = {
  id: string;
  title: string;
  description: string;
  type: string;
  attributeCodes: string[];
  baseXp: number;
  difficulty: string;
  isMandatory: boolean;
  done: boolean;
  targetRank?: string | null;
};

type LevelUp = { code: string; name: string; level: number };

export default function QuetesPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [day, setDay] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/quests").then((res) => res.json());
    setQuests(r.quests || []);
    setDay(r.day || "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function complete(id: string) {
    const r = await fetch("/api/quests/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId: id }),
    }).then((res) => res.json());

    if (r.error) {
      setToast(r.error);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    let msg = "+" + r.gained + " XP";
    if (r.levelUps && r.levelUps.length) {
      msg += " · " + r.levelUps.map((l: LevelUp) => l.name + " Niv." + l.level + " !").join(" · ");
    }
    if (r.promoted) {
      msg = "⩘ RANG " + r.promoted.to + " ATTEINT !";
    }
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
    load();
  }

  if (loading) return <p className="animate-pulse text-system-accent">Chargement des quêtes…</p>;

  const rankup = quests.filter((q) => q.type === "rankup");
  const mandatory = quests.filter((q) => q.isMandatory && q.type !== "rankup");
  const normal = quests.filter((q) => !q.isMandatory && q.type !== "rankup");

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">
          [Système] {toast}
        </div>
      )}

      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">
        Quêtes — {day}
      </h1>

      {rankup.length > 0 && (
        <SystemPanel title="[ Épreuve de promotion ]">
          {rankup.map((q) => (
            <QuestRow key={q.id} q={q} onDone={complete} />
          ))}
        </SystemPanel>
      )}

      {mandatory.length > 0 && (
        <SystemPanel title="[ Quête obligatoire du Système ]">
          {mandatory.map((q) => (
            <QuestRow key={q.id} q={q} onDone={complete} />
          ))}
        </SystemPanel>
      )}

      <SystemPanel title="[ Quêtes journalières ]">
        {normal.length === 0 ? (
          <p className="text-sm text-system-text/60">Aucune quête.</p>
        ) : (
          normal.map((q) => <QuestRow key={q.id} q={q} onDone={complete} />)
        )}
      </SystemPanel>
    </div>
  );
}

function QuestRow({ q, onDone }: { q: Quest; onDone: (id: string) => void }) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 border-b border-system-border/20 py-3 last:border-0 " +
        (q.done ? "opacity-50" : "")
      }
    >
      <div>
        <p className="text-sm">{q.title}</p>
        <p className="text-[11px] text-system-text/50">
          {q.attributeCodes.join(" · ")}
          {q.attributeCodes.length ? " · " : ""}diff. {q.difficulty} · {q.baseXp} XP
        </p>
      </div>
      <button
        disabled={q.done}
        onClick={() => onDone(q.id)}
        className="shrink-0 rounded border border-system-border px-3 py-1 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {q.done ? "Fait" : "Compléter"}
      </button>
    </div>
  );
}
