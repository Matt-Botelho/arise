import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const reward = await prisma.reward.findUnique({ where: { id: b.id } });
  if (!reward || reward.hunterId !== hunter.id) {
    return NextResponse.json({ error: "Récompense introuvable" }, { status: 404 });
  }
  if (hunter.gold < reward.cost) {
    return NextResponse.json({ error: "Pas assez d'or" }, { status: 400 });
  }
  const newGold = hunter.gold - reward.cost;
  await prisma.hunter.update({ where: { id: hunter.id }, data: { gold: newGold } });
  await prisma.reward.update({ where: { id: reward.id }, data: { redeemedAt: new Date() } });
  return NextResponse.json({ ok: true, gold: newGold });
}
