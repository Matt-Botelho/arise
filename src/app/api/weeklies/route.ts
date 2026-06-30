import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay, weekKeyOf } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const wk = weekKeyOf(gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour));
  const weeklies = await prisma.weekly.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "asc" } });
  for (const w of weeklies) {
    if (w.weekKey !== wk) {
      const steps = (JSON.parse(w.stepsJson || "[]") as { label: string }[]).map((s) => ({ label: s.label, done: false }));
      await prisma.weekly.update({ where: { id: w.id }, data: { stepsJson: JSON.stringify(steps), status: "active", weekKey: wk } });
      w.stepsJson = JSON.stringify(steps); w.status = "active"; w.weekKey = wk;
    }
  }
  return NextResponse.json({
    weekKey: wk,
    weeklies: weeklies.map((w) => ({ ...w, steps: JSON.parse(w.stepsJson || "[]"), attributeCodes: JSON.parse(w.attributeCodes || "[]") })),
  });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { title?: string; description?: string; steps?: string[]; attributeCodes?: string[]; baseXp?: number };
  if (!b.title || !b.title.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const steps = (Array.isArray(b.steps) ? b.steps : []).filter((x) => typeof x === "string" && x.trim()).map((label) => ({ label: label.trim(), done: false }));
  if (steps.length === 0) return NextResponse.json({ error: "Ajoute au moins une étape." }, { status: 400 });
  const wk = weekKeyOf(gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour));
  const weekly = await prisma.weekly.create({
    data: {
      hunterId: hunter.id, title: b.title.trim(), description: typeof b.description === "string" ? b.description : "",
      stepsJson: JSON.stringify(steps), attributeCodes: JSON.stringify(Array.isArray(b.attributeCodes) ? b.attributeCodes : []),
      baseXp: Number.isInteger(b.baseXp) && (b.baseXp as number) > 0 ? (b.baseXp as number) : 400, status: "active", weekKey: wk,
    },
  });
  return NextResponse.json({ ok: true, weekly });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.weekly.delete({ where: { id: b.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
