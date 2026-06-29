import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EQUIPPED, STARTER_ITEMS, ITEMS } from "@/lib/lpc-items";
import { rankIndex } from "@/lib/game";
import type { Rank } from "@/lib/game.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  let appearance = hunter.appearanceJson ? JSON.parse(hunter.appearanceJson) : null;
  let equipped = hunter.equippedJson ? JSON.parse(hunter.equippedJson) : null;
  if (!appearance || !appearance.bodyType) appearance = { bodyType: "male" };
  const needsMigrate = !equipped || !equipped.torso;
  if (needsMigrate) equipped = DEFAULT_EQUIPPED;
  if (!hunter.appearanceJson || needsMigrate) {
    await prisma.hunter.update({ where: { id: hunter.id }, data: { appearanceJson: JSON.stringify(appearance), equippedJson: JSON.stringify(equipped) } });
  }

  const count = await prisma.inventoryItem.count({ where: { hunterId: hunter.id } });
  if (count === 0) for (const k of STARTER_ITEMS) await prisma.inventoryItem.create({ data: { hunterId: hunter.id, itemKey: k } }).catch(() => {});
  const owned = (await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } })).map((i) => i.itemKey);

  return NextResponse.json({ appearance, equipped, owned, rankIndex: rankIndex(hunter.rank as Rank), catalog: ITEMS });
}
