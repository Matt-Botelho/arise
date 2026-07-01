// Historique des notes de semaine (ladder contre soi-même).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const scores = await prisma.weekScore.findMany({ where: { hunterId: hunter.id }, orderBy: { weekKey: "desc" }, take: 12 });
  return NextResponse.json({ best: hunter.bestWeekScore, scores });
}
