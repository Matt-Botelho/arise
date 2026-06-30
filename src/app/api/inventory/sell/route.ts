import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEM_BY_KEY } from "@/lib/lpc-items";
import { SELL_VALUE } from "@/lib/loot";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { itemKey?: string };
  if (!b.itemKey) return NextResponse.json({ error: "itemKey requis" }, { status: 400 });
  const it = ITEM_BY_KEY[b.itemKey];
  if (!it) return NextResponse.json({ error: "Objet inconnu" }, { status: 404 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const inv = await prisma.inventoryItem.findUnique({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: b.itemKey } } });
  if (!inv || inv.qty <= 1) return NextResponse.json({ error: "Aucun doublon à vendre (tu gardes 1 exemplaire)." }, { status: 400 });
  const value = SELL_VALUE[it.rarity] ?? 0;
  await prisma.inventoryItem.update({ where: { id: inv.id }, data: { qty: { decrement: 1 } } });
  const gold = hunter.gold + value;
  await prisma.hunter.update({ where: { id: hunter.id }, data: { gold } });
  return NextResponse.json({ ok: true, gold, value });
}
