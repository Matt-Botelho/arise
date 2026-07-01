import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const rewards = await prisma.reward.findMany({ where: { hunterId: hunter.id }, orderBy: { cost: "asc" } });
  return NextResponse.json({ gold: hunter.gold, rewards });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { title?: string; cost?: number; icon?: string };
  if (!b.title || typeof b.title !== "string" || !b.title.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }
  const cost = Number.isInteger(b.cost) && (b.cost as number) > 0 ? (b.cost as number) : 100;
  const icon = typeof b.icon === "string" && b.icon.trim() ? Array.from(b.icon.trim())[0] : "🎁";
  const reward = await prisma.reward.create({ data: { hunterId: hunter.id, title: b.title.trim(), cost, icon } });
  return NextResponse.json({ ok: true, reward });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.reward.delete({ where: { id: b.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
