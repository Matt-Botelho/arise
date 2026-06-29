import { NextResponse } from "next/server";
import { sendPushToAll, pushReady } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!pushReady()) {
    return NextResponse.json({ error: "VAPID non configure (ajoute les cles dans .env)" }, { status: 400 });
  }
  const r = await sendPushToAll({ title: "Le Système", body: "Notification de test ✅", url: "/" });
  return NextResponse.json(r);
}
