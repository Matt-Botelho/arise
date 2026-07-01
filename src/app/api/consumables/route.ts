import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONSUMABLES, CONSUMABLE_BY_KEY } from "@/lib/consumables";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const consumables = hunter.consumablesJson ? JSON.parse(hunter.consumablesJson) : {};
  const buffs = hunter.buffsJson ? JSON.parse(hunter.buffsJson) : {};
  return NextResponse.json({ gold: hunter.gold, consumables, buffs, catalog: CONSUMABLES });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { key?: string };
  const def = b.key ? CONSUMABLE_BY_KEY[b.key] : null;
  if (!def) return NextResponse.json({ error: "Consommable inconnu" }, { status: 400 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  if (hunter.gold < def.price) return NextResponse.json({ error: "Pas assez d'or (" + def.price + " requis)." }, { status: 400 });
  const consumables = hunter.consumablesJson ? JSON.parse(hunter.consumablesJson) : {};
  consumables[def.key] = (consumables[def.key] || 0) + 1;
  const gold = hunter.gold - def.price;
  await prisma.hunter.update({ where: { id: hunter.id }, data: { gold, consumablesJson: JSON.stringify(consumables) } });
  return NextResponse.json({ ok: true, gold, consumables });
}
