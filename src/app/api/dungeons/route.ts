import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const dungeons = await prisma.dungeon.findMany({ where: { hunterId: hunter.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    dungeons: dungeons.map((d) => ({
      ...d,
      steps: JSON.parse(d.stepsJson || "[]"),
      attributeCodes: JSON.parse(d.attributeCodes || "[]"),
    })),
  });
}

export async function POST(req: Request) {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as {
    title?: string; description?: string; rank?: string; steps?: string[]; rewardXp?: number; attributeCodes?: string[];
  };
  if (!b.title || !b.title.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const steps = (Array.isArray(b.steps) ? b.steps : [])
    .filter((x) => typeof x === "string" && x.trim())
    .map((label) => ({ label: label.trim(), done: false }));
  const dungeon = await prisma.dungeon.create({
    data: {
      hunterId: hunter.id,
      title: b.title.trim(),
      description: typeof b.description === "string" ? b.description : "",
      rank: ["E", "D", "C", "B", "A", "S"].includes(b.rank || "") ? (b.rank as string) : "D",
      stepsJson: JSON.stringify(steps),
      attributeCodes: JSON.stringify(Array.isArray(b.attributeCodes) ? b.attributeCodes : []),
      rewardXp: Number.isInteger(b.rewardXp) && (b.rewardXp as number) > 0 ? (b.rewardXp as number) : 300,
    },
  });
  return NextResponse.json({ ok: true, dungeon });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.dungeon.delete({ where: { id: b.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
