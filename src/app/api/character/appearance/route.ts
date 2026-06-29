import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { bodyType?: string };
  const cur = hunter.appearanceJson ? JSON.parse(hunter.appearanceJson) : { bodyType: "male" };
  if (typeof b.bodyType === "string" && ["male"].includes(b.bodyType)) cur.bodyType = b.bodyType;
  await prisma.hunter.update({ where: { id: hunter.id }, data: { appearanceJson: JSON.stringify(cur) } });
  return NextResponse.json({ ok: true, appearance: cur });
}
