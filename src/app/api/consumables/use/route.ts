import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONSUMABLE_BY_KEY, BUFF_FIELD, BUFF_HOURS } from "@/lib/consumables";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { key?: string };
  const def = b.key ? CONSUMABLE_BY_KEY[b.key] : null;
  if (!def) return NextResponse.json({ error: "Consommable inconnu" }, { status: 400 });
  if (def.kind !== "buff") return NextResponse.json({ error: "Ce consommable est automatique (protection)." }, { status: 400 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const consumables = hunter.consumablesJson ? JSON.parse(hunter.consumablesJson) : {};
  if ((consumables[def.key] || 0) <= 0) return NextResponse.json({ error: "Tu n'en possèdes pas." }, { status: 400 });
  consumables[def.key] -= 1;
  const buffs = hunter.buffsJson ? JSON.parse(hunter.buffsJson) : {};
  buffs[BUFF_FIELD[def.key]] = new Date(Date.now() + BUFF_HOURS * 3600_000).toISOString();
  await prisma.hunter.update({ where: { id: hunter.id }, data: { consumablesJson: JSON.stringify(consumables), buffsJson: JSON.stringify(buffs) } });
  return NextResponse.json({ ok: true, consumables, buffs });
}
