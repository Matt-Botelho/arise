import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EQUIPPED, STARTER_ITEMS, ITEMS, ITEM_BY_KEY } from "@/lib/lpc-items";
import { rankIndex } from "@/lib/game";
import type { Rank } from "@/lib/game.config";

export const dynamic = "force-dynamic";
const INV_VERSION = 3; // bascule vers le modèle loot : on offre les communs, le reste se loote

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  const appearance = hunter.appearanceJson ? JSON.parse(hunter.appearanceJson) : { bodyType: "male" };
  if (!appearance.bodyType) appearance.bodyType = "male";
  let equipped = hunter.equippedJson ? JSON.parse(hunter.equippedJson) : null;
  const invalidEquip = !equipped || !equipped.torso ||
    Object.values(equipped).some((v) => v && (v as { key?: string }).key && !ITEM_BY_KEY[(v as { key: string }).key]);
  if (invalidEquip) equipped = DEFAULT_EQUIPPED;

  let changed = invalidEquip || !hunter.appearanceJson;
  if (appearance.invVersion !== INV_VERSION) {
    await prisma.inventoryItem.deleteMany({ where: { hunterId: hunter.id } });
    for (const k of STARTER_ITEMS) await prisma.inventoryItem.create({ data: { hunterId: hunter.id, itemKey: k } }).catch(() => {});
    appearance.invVersion = INV_VERSION;
    changed = true;
  }
  if (changed) {
    await prisma.hunter.update({ where: { id: hunter.id }, data: { appearanceJson: JSON.stringify(appearance), equippedJson: JSON.stringify(equipped) } });
  }

  const owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);
  return NextResponse.json({ appearance, equipped, owned, rankIndex: rankIndex(hunter.rank as Rank), catalog: ITEMS });
}
