// Serments du jour : choisis le matin, verrouillés ensuite, évalués au tick.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { OATHS, OATH_BY_KEY, oathsStateFor, MAX_OATHS_PER_DAY, type OathsState } from "@/lib/oaths";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  let stored: OathsState | null = null;
  try { stored = hunter.oathsJson ? JSON.parse(hunter.oathsJson) : null; } catch { stored = null; }
  const st = oathsStateFor(day, stored);
  return NextResponse.json({
    day,
    catalog: OATHS,
    active: st.keys,
    locked: st.keys.length > 0, // une fois prêtés, les serments du jour sont scellés
    max: MAX_OATHS_PER_DAY,
  });
}

// POST { keys: string[] } — prête les serments du jour (une seule fois par jour).
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { keys?: string[] };
  const keys = (Array.isArray(b.keys) ? b.keys : []).filter((k) => OATH_BY_KEY[k]).slice(0, MAX_OATHS_PER_DAY);
  if (!keys.length) return NextResponse.json({ error: "Aucun serment valide" }, { status: 400 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  let stored: OathsState | null = null;
  try { stored = hunter.oathsJson ? JSON.parse(hunter.oathsJson) : null; } catch { stored = null; }
  const st = oathsStateFor(day, stored);
  if (st.keys.length > 0) return NextResponse.json({ error: "Serments déjà scellés pour aujourd'hui." }, { status: 400 });
  await prisma.hunter.update({ where: { id: hunter.id }, data: { oathsJson: JSON.stringify({ date: day, keys }) } });
  return NextResponse.json({ ok: true, active: keys });
}
