import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const sub = (await req.json().catch(() => null)) as { endpoint?: string; keys?: unknown } | null;
  if (!sub || !sub.endpoint || !sub.keys) {
    return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
  }
  await prisma.pushSub.upsert({
    where: { endpoint: sub.endpoint },
    update: { keys: JSON.stringify(sub.keys), hunterId: hunter.id },
    create: { endpoint: sub.endpoint, keys: JSON.stringify(sub.keys), hunterId: hunter.id },
  });
  return NextResponse.json({ ok: true });
}
