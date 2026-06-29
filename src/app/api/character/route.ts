import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EQUIPPED, STARTER_ITEMS, ITEMS, ITEM_BY_KEY } from "@/lib/lpc-items";
import { rankIndex } from "@/lib/game";
import type { Rank } from "@/lib/game.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  let appearance = hunter.appearanceJson ? JSON.parse(hunter.appearanceJson) : null;
  let equipped = hunter.equippedJson ? JSON.parse(hunter.equippedJson) : null;
  if (!appearance || !appearance.bodyType) appearance = { bodyType: "male" };

  // Réinitialise si format ancien OU si une pièce équipée n'existe plus dans le catalogue.
  const invalid =
    !equipped ||
    !equipped.torso ||
    Object.values(equipped).some((v) => v && (v as { key?: string }).key && !ITEM_BY_KEY[(v as { key: string }).key]);
  if (invalid) equipped = DEFAULT_EQUIPPED;
  if (!hunter.appearanceJson || invalid) {
    await prisma.hunter.update({ where: { id: hunter.id }, data: { appearanceJson: JSON.stringify(appearance), equippedJson: JSON.stringify(equipped) } });
  }

  let owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);
  const missing = STARTER_ITEMS.filter((k) => !owned.includes(k));
  if (missing.length) {
    for (const k of missing) await prisma.inventoryItem.create({ data: { hunterId: hunter.id, itemKey: k } }).catch(() => {});
    owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);
  }

  return NextResponse.json({ appearance, equipped, owned, rankIndex: rankIndex(hunter.rank as Rank), catalog: ITEMS });
}
