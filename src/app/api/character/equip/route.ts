import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEM_BY_KEY, EQUIP_SLOTS, DEFAULT_EQUIPPED, type Slot } from "@/lib/lpc-items";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { slot?: string; key?: string | null; color?: string | null };
  if (!b.slot || !EQUIP_SLOTS.includes(b.slot as Slot)) return NextResponse.json({ error: "Slot invalide" }, { status: 400 });

  const equipped = hunter.equippedJson ? JSON.parse(hunter.equippedJson) : { ...DEFAULT_EQUIPPED };
  if (!b.key) {
    equipped[b.slot] = null;
  } else {
    const item = ITEM_BY_KEY[b.key];
    if (!item || item.slot !== b.slot) return NextResponse.json({ error: "Objet invalide pour ce slot" }, { status: 400 });
    const owns = await prisma.inventoryItem.findFirst({ where: { hunterId: hunter.id, itemKey: b.key } });
    if (!owns) return NextResponse.json({ error: "Objet non possédé" }, { status: 400 });
    equipped[b.slot] = { key: b.key, ...(b.color ? { color: b.color } : {}) };
  }
  await prisma.hunter.update({ where: { id: hunter.id }, data: { equippedJson: JSON.stringify(equipped) } });
  return NextResponse.json({ ok: true, equipped });
}
