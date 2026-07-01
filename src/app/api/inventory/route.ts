import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEM_BY_KEY } from "@/lib/lpc-items";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const inv = await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } });
  const items = inv
    .map((i) => { const it = ITEM_BY_KEY[i.itemKey]; return it ? { itemKey: i.itemKey, qty: i.qty, plus: i.plus, name: it.name, slot: it.slot, rarity: it.rarity } : null; })
    .filter(Boolean);
  return NextResponse.json({ gold: hunter.gold, shards: hunter.shards, items });
}
