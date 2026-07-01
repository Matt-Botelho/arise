import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEM_BY_KEY } from "@/lib/lpc-items";
import { SET_BY_ITEM } from "@/lib/sets";
import { parseExo } from "@/lib/forge";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const inv = await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } });
  const items = inv
    .map((i) => {
      const it = ITEM_BY_KEY[i.itemKey];
      if (!it) return null;
      const set = SET_BY_ITEM[i.itemKey];
      return { itemKey: i.itemKey, qty: i.qty, plus: i.plus, exo: parseExo(i.exoJson), name: it.name, slot: it.slot, rarity: it.rarity, setName: set ? set.name : null, setColor: set ? set.color : null };
    })
    .filter(Boolean);
  return NextResponse.json({ gold: hunter.gold, shards: hunter.shards, items });
}
