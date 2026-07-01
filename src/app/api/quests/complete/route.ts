import { NextResponse } from "next/server";
import { completeQuest } from "@/app/api/_lib/award";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { questId?: string };
  if (!body.questId) return NextResponse.json({ error: "questId manquant" }, { status: 400 });
  const r = await completeQuest(body.questId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
