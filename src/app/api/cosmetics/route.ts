import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COSMETICS, COSMETIC_BY_KEY } from "@/lib/cosmetics";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const inv = await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } });
  const owned = new Set(inv.map((i) => i.itemKey));
  const catalog = COSMETICS.map((c) => ({ ...c, owned: owned.has(c.key) }));
  return NextResponse.json({ shards: hunter.shards, catalog });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { key?: string };
  const def = b.key ? COSMETIC_BY_KEY[b.key] : null;
  if (!def) return NextResponse.json({ error: "Cosmétique inconnu" }, { status: 400 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const existing = await prisma.inventoryItem.findUnique({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: def.key } } });
  if (existing) return NextResponse.json({ error: "Déjà possédé." }, { status: 400 });
  if (hunter.shards < def.cost) return NextResponse.json({ error: "Pas assez d'Éclats (" + def.cost + " ✦ requis)." }, { status: 400 });
  const shards = hunter.shards - def.cost;
  await prisma.$transaction([
    prisma.hunter.update({ where: { id: hunter.id }, data: { shards } }),
    prisma.inventoryItem.create({ data: { hunterId: hunter.id, itemKey: def.key } }),
  ]);
  return NextResponse.json({ ok: true, shards, itemKey: def.key });
}
