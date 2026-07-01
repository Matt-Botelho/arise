// Pont Apple Santé → ARISE. L'app iOS "Health Auto Export" POSTe ici son JSON
// (Automations → REST API), avec le header x-system-secret. Apple Santé est le hub :
// pas (iPhone), poids (balance connectée), calories (app nutrition), sommeil, etc.
// Effets : stockage HealthSample + AUTO-VALIDATION des quêtes `auto` + mise à jour
// des objectifs métriques liés (ex. poids). Le Système te voit agir.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { parseHealthPayload, autoQuestSatisfied, METRIC_BY_KEY } from "@/lib/health";
import { completeQuest } from "@/app/api/_lib/award";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.SYSTEM_CRON_SECRET || "change-me";
  return req.headers.get("x-system-secret") === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  const payload = await req.json().catch(() => null);
  const samples = parseHealthPayload(payload);
  if (!samples.length) return NextResponse.json({ ok: true, stored: 0, message: "Aucune métrique reconnue" });

  for (const s of samples) {
    await prisma.healthSample.upsert({
      where: { hunterId_date_metric: { hunterId: hunter.id, date: s.date, metric: s.metric } },
      update: { value: s.value, unit: s.unit },
      create: { hunterId: hunter.id, date: s.date, metric: s.metric, value: s.value, unit: s.unit },
    });
  }

  const today = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const todayByMetric: Record<string, number> = {};
  const rows = await prisma.healthSample.findMany({ where: { hunterId: hunter.id, date: today } });
  for (const r of rows) todayByMetric[r.metric] = r.value;

  // 1. Auto-validation des quêtes `auto` dont le seuil est atteint aujourd'hui.
  const autoQuests = await prisma.quest.findMany({ where: { hunterId: hunter.id, active: true, type: "auto" } });
  const validated: { title: string; value: number; threshold: number }[] = [];
  for (const q of autoQuests) {
    if (!q.metricKey || typeof q.threshold !== "number") continue;
    const value = todayByMetric[q.metricKey];
    if (typeof value !== "number" || !autoQuestSatisfied(value, q.threshold)) continue;
    const r = await completeQuest(q.id, { auto: true });
    if (!("error" in r)) validated.push({ title: q.title, value, threshold: q.threshold });
  }

  // 2. Objectifs métriques liés à une métrique santé : currentValue suit la dernière mesure.
  const metricObjs = await prisma.objective.findMany({ where: { hunterId: hunter.id, kind: "metric", status: "active", metricKey: { not: null } } });
  let objectivesUpdated = 0;
  for (const o of metricObjs) {
    const latest = await prisma.healthSample.findFirst({ where: { hunterId: hunter.id, metric: o.metricKey as string }, orderBy: { date: "desc" } });
    if (!latest || o.currentValue === latest.value) continue;
    await prisma.objective.update({ where: { id: o.id }, data: { currentValue: latest.value } });
    objectivesUpdated++;
  }

  if (validated.length) {
    const def = METRIC_BY_KEY[autoQuests.find((q) => q.title === validated[0].title)?.metricKey || ""];
    const first = validated[0];
    const body = validated.length === 1
      ? "Détecté : " + Math.round(first.value) + (def ? " " + def.unit : "") + ". Quête accomplie : " + first.title
      : validated.length + " quêtes accomplies automatiquement. Le Système te voit.";
    await sendPushToAll({ title: "Le Système", body, url: "/quetes" });
  }

  return NextResponse.json({ ok: true, stored: samples.length, autoValidated: validated.length, objectivesUpdated });
}

// État pour l'UI de Configuration : dernières valeurs par métrique + activité récente.
export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const today = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  const recent = await prisma.healthSample.findMany({ where: { hunterId: hunter.id }, orderBy: [{ date: "desc" }], take: 60 });
  const latest: Record<string, { value: number; date: string; unit: string }> = {};
  for (const r of recent) if (!latest[r.metric]) latest[r.metric] = { value: r.value, date: r.date, unit: r.unit };
  return NextResponse.json({ today, latest, count: recent.length });
}
