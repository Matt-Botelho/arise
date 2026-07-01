"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SystemPanel from "@/components/SystemPanel";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding").then((r) => r.json()).then((d) => { if (!d.error && d.name) setName(d.name); }).catch(() => {});
  }, []);

  async function enter(dest: string) {
    setBusy(true);
    await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || "Chasseur", objectives: [] }) }).catch(() => {});
    router.push(dest);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-system-accent/70">Protocole d'Éveil</p>
        <h1 className="mt-2 text-2xl font-bold text-system-accent system-glow">Le Système t'a choisi, Chasseur</h1>
      </div>

      <SystemPanel title="[ Message du Système ]">
        <p className="text-sm leading-relaxed text-system-text/80">
          Ta vie devient une aventure. Voici comment le Système fonctionne :
        </p>
        <ul className="mt-3 space-y-2 text-sm text-system-text/75">
          <li>◆ <span className="text-system-accent">Aventures</span> — tes grands objectifs de vie, découpés en Quête Principale → Chapitres → quêtes courtes.</li>
          <li>⚡ <span className="text-system-accent">Quêtes</span> — tes actions du jour ; chaque validation te donne de l'XP et fait monter tes 9 compétences.</li>
          <li>⩘ <span className="text-system-accent">Histoire Principale</span> — ton ascension de rang (F → SS Elite), qui exige de progresser dans toutes tes compétences.</li>
          <li>🏰 <span className="text-system-accent">Donjons</span> — les grandes épreuves qui scellent tes paliers.</li>
        </ul>
      </SystemPanel>

      <SystemPanel title="[ Identité ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Ton nom de Chasseur</label>
        <input className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent" placeholder="Chasseur" value={name} onChange={(e) => setName(e.target.value)} />
      </SystemPanel>

      <button onClick={() => enter("/configuration")} disabled={busy} className="w-full rounded border border-system-border px-4 py-4 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10 disabled:opacity-40 system-glow">
        {busy ? "Ouverture du portail…" : "⚡ Forger ma première Quête Principale (Assistant)"}
      </button>
      <button onClick={() => enter("/")} disabled={busy} className="w-full rounded border border-system-border/40 px-4 py-2 text-xs uppercase tracking-widest text-system-text/60 hover:bg-system-accent/10 disabled:opacity-40">
        Entrer directement dans le Système
      </button>
    </div>
  );
}
