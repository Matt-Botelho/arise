// La Porte du jour : épreuve surprise apparue au tick (1 chance sur 3), expire à minuit (jour de jeu).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { applyGlobalXp, rankCeiling } from "@/lib/progression";
import { gateRankColor } from "@/lib/gates";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const gate = await prisma.gate.findUnique({ where: { hunterId_date: { hunterId: hunter.id, date: day } } });
  return NextResponse.json({ day, gate: gate ? { ...gate, color: gateRankColor(gate.rank) } : null });
}

// POST { id } — franchit la Porte du jour (récompense XP globale + or).
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const gate = await prisma.gate.findUnique({ where: { id: b.id } });
  if (!gate) return NextResponse.json({ error: "Porte introuvable" }, { status: 404 });
  if (gate.status !== "open") return NextResponse.json({ error: "Cette Porte est déjà refermée." }, { status: 400 });
  const hunter = await prisma.hunter.findUnique({ where: { id: gate.hunterId } });
  if (!hunter) return NextResponse.json({ error: "Chasseur introuvable" }, { status: 404 });
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  if (gate.date !== day) {
    await prisma.gate.update({ where: { id: gate.id }, data: { status: "expired" } });
    return NextResponse.json({ error: "La Porte s'est refermée à la fin de la journée." }, { status: 400 });
  }
  const g = applyGlobalXp(hunter.globalLevel, hunter.globalXp, gate.xp, rankCeiling(hunter.rank));
  await prisma.$transaction([
    prisma.gate.update({ where: { id: gate.id }, data: { status: "cleared" } }),
    prisma.hunter.update({ where: { id: hunter.id }, data: { gold: hunter.gold + gate.gold, globalLevel: g.level, globalXp: g.xp } }),
  ]);
  return NextResponse.json({ ok: true, gained: gate.xp, goldGain: gate.gold, globalLevel: g.level, globalLeveledUp: g.leveledUp });
}
