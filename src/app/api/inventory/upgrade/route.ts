import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEM_BY_KEY } from "@/lib/lpc-items";
import { UPGRADE_MAX, upgradeCost } from "@/lib/effects";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { itemKey?: string };
  if (!b.itemKey) return NextResponse.json({ error: "itemKey requis" }, { status: 400 });
  if (!ITEM_BY_KEY[b.itemKey]) return NextResponse.json({ error: "Objet inconnu" }, { status: 404 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const inv = await prisma.inventoryItem.findUnique({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: b.itemKey } } });
  if (!inv) return NextResponse.json({ error: "Objet non possédé" }, { status: 404 });
  if (inv.plus >= UPGRADE_MAX) return NextResponse.json({ error: "Amélioration déjà au maximum (+" + UPGRADE_MAX + ")" }, { status: 400 });
  if (inv.qty <= 1) return NextResponse.json({ error: "Il faut un doublon à sacrifier pour améliorer." }, { status: 400 });
  const cost = upgradeCost(inv.plus);
  if (hunter.gold < cost) return NextResponse.json({ error: "Pas assez d'or (" + cost + " requis)." }, { status: 400 });
  await prisma.inventoryItem.update({ where: { id: inv.id }, data: { qty: { decrement: 1 }, plus: { increment: 1 } } });
  const gold = hunter.gold - cost;
  await prisma.hunter.update({ where: { id: hunter.id }, data: { gold } });
  return NextResponse.json({ ok: true, plus: inv.plus + 1, gold, spent: cost });
}
