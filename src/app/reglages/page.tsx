"use client";

import { useEffect, useState } from "react";
import SystemPanel from "@/components/SystemPanel";

type Settings = { name: string; penaltyIntensity: string; dayRolloverHour: number; timezone: string };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function ReglagesPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notif, setNotif] = useState<string>("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => !d.error && setS(d));
    if (typeof window !== "undefined" && "Notification" in window) setNotif(Notification.permission);
  }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3500); }

  async function save() {
    if (!s) return;
    const r = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
    }).then((res) => res.json());
    flash(r.ok ? "Réglages enregistrés" : (r.error || "Erreur"));
  }

  async function enableNotifications() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) { flash("Notifications non supportées ici"); return; }
      const perm = await Notification.requestPermission();
      setNotif(perm);
      if (perm !== "granted") { flash("Permission refusée"); return; }
      const keyRes = await fetch("/api/push/public-key").then((r) => r.json());
      if (!keyRes.key) { flash("VAPID non configuré côté serveur"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.key),
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub),
      }).then((res) => res.json());
      flash(r.ok ? "Notifications activées ✅" : "Erreur d'abonnement");
    } catch (e) { flash("Erreur : " + String(e)); }
  }

  async function testNotification() {
    const r = await fetch("/api/push/test", { method: "POST" }).then((res) => res.json());
    flash(r.error ? r.error : "Envoyé à " + (r.sent ?? 0) + " appareil(s)");
  }

  if (!s) return <p className="animate-pulse text-system-accent">Chargement…</p>;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded border border-system-border bg-system-panel px-4 py-2 text-sm text-system-accent shadow-system system-glow">
          [Système] {toast}
        </div>
      )}
      <h1 className="text-lg uppercase tracking-[0.2em] text-system-accent system-glow">Réglages</h1>

      <SystemPanel title="[ Notifications du Système ]">
        <p className="text-xs text-system-text/60">État : {notif || "inconnu"}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={enableNotifications} className="flex-1 rounded border border-system-border px-3 py-2 text-xs uppercase tracking-widest text-system-accent hover:bg-system-accent/10">
            Activer
          </button>
          <button onClick={testNotification} className="flex-1 rounded border border-system-border/50 px-3 py-2 text-xs uppercase tracking-widest text-system-text/80 hover:bg-system-accent/10">
            Tester
          </button>
        </div>
        <p className="mt-2 text-[11px] text-system-text/40">Sur iPhone : ajoute d'abord l'app à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis active.</p>
      </SystemPanel>

      <SystemPanel title="[ Chasseur ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Nom</label>
        <input
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.name}
          onChange={(e) => setS({ ...s, name: e.target.value })}
        />
      </SystemPanel>

      <SystemPanel title="[ Pénalités ]">
        <label className="block text-xs uppercase tracking-widest text-system-text/60">Intensité (quête obligatoire ratée)</label>
        <select
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.penaltyIntensity}
          onChange={(e) => setS({ ...s, penaltyIntensity: e.target.value })}
        >
          <option value="off">Off — aucune pénalité</option>
          <option value="douce">Douce — léger malus, reset de série</option>
          <option value="fidele">Fidèle — perte de PV/XP (recommandé)</option>
          <option value="hardcore">Hardcore — grosse perte de PV/XP</option>
        </select>

        <label className="mt-4 block text-xs uppercase tracking-widest text-system-text/60">Heure de bascule de journée (0-23)</label>
        <input
          type="number" min={0} max={23}
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.dayRolloverHour}
          onChange={(e) => setS({ ...s, dayRolloverHour: parseInt(e.target.value || "0", 10) })}
        />

        <label className="mt-4 block text-xs uppercase tracking-widest text-system-text/60">Fuseau horaire</label>
        <input
          className="mt-1 w-full rounded border border-system-border/40 bg-black/40 px-3 py-2 text-sm outline-none focus:border-system-accent"
          value={s.timezone}
          onChange={(e) => setS({ ...s, timezone: e.target.value })}
        />
      </SystemPanel>

      <button onClick={save} className="w-full rounded border border-system-border px-4 py-3 text-sm uppercase tracking-widest text-system-accent hover:bg-system-accent/10">
        Enregistrer
      </button>
    </div>
  );
}
