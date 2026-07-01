import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DAY_THEME } from "@/lib/progression";
import { ATTRIBUTES } from "@/lib/game.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await prisma.hunter.findFirst();
  if (!h) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  return NextResponse.json({
    name: h.name,
    penaltyIntensity: h.penaltyIntensity,
    dayRolloverHour: h.dayRolloverHour,
    timezone: h.timezone,
    dayTheme: h.dayThemeJson ? JSON.parse(h.dayThemeJson) : DEFAULT_DAY_THEME,
    sfxEnabled: h.sfxEnabled,
  });
}

export async function POST(req: Request) {
  const h = await prisma.hunter.findFirst();
  if (!h) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.penaltyIntensity === "string" && ["off", "douce", "fidele", "hardcore"].includes(body.penaltyIntensity)) data.penaltyIntensity = body.penaltyIntensity;
  if (typeof body.dayRolloverHour === "number" && Number.isInteger(body.dayRolloverHour) && body.dayRolloverHour >= 0 && body.dayRolloverHour <= 23) data.dayRolloverHour = body.dayRolloverHour;
  if (typeof body.timezone === "string" && body.timezone.trim()) data.timezone = body.timezone.trim();
  if (typeof body.sfxEnabled === "boolean") data.sfxEnabled = body.sfxEnabled;
  if (body.dayTheme && typeof body.dayTheme === "object") {
    const codes = new Set(ATTRIBUTES.map((a) => a.code));
    const clean: Record<string, string> = {};
    for (const k of ["0", "1", "2", "3", "4", "5", "6"]) {
      const v = (body.dayTheme as Record<string, unknown>)[k];
      if (typeof v === "string" && codes.has(v)) clean[k] = v;
    }
    if (Object.keys(clean).length) data.dayThemeJson = JSON.stringify(clean);
  }
  const updated = await prisma.hunter.update({ where: { id: h.id }, data });
  return NextResponse.json({
    ok: true,
    settings: { name: updated.name, penaltyIntensity: updated.penaltyIntensity, dayRolloverHour: updated.dayRolloverHour, timezone: updated.timezone, dayTheme: updated.dayThemeJson ? JSON.parse(updated.dayThemeJson) : DEFAULT_DAY_THEME, sfxEnabled: updated.sfxEnabled },
  });
}
