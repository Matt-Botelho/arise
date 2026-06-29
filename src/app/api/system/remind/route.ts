import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { gameDay } from "@/lib/date";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  return req.headers.get("x-system-secret") === (process.env.SYSTEM_CRON_SECRET || "change-me");
}

async function run() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return { error: "Aucun chasseur" };
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const quests = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, type: "daily" } });
  const logs = await prisma.questLog.findMany({ where: { hunterId: hunter.id, date: day, status: "done" } });
  const done = new Set(logs.map((l) => l.questId));
  const remaining = quests.filter((q) => !done.has(q.id)).length;
  const body = remaining > 0
    ? "Tu as " + remaining + " quete(s) du jour a accomplir, Chasseur."
    : "Toutes tes quetes du jour sont faites. Repos bien merite.";
  return await sendPushToAll({ title: "Le Système", body, url: "/quetes" });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await run());
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  return NextResponse.json(await run());
}
