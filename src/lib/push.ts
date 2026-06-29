import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@leveling.matthomelab.tech";
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
}

export function pushReady(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  if (!pushReady()) return { sent: 0, skipped: true };
  configure();
  const subs = await prisma.pushSub.findMany();
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: JSON.parse(s.keys) },
        JSON.stringify(payload)
      );
      sent++;
    } catch (e: unknown) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await prisma.pushSub.delete({ where: { id: s.id } }).catch(() => {});
      }
    }
  }
  return { sent };
}
