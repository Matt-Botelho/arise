// Almanax du jour (bonus + offrande + Méréons ❖) et Temple (cosmétiques exclusifs).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameDay } from "@/lib/date";
import { almanaxStateFor, OFFERING_BY_KEY, offeringFor, TEMPLE_ITEMS, type AlmanaxState } from "@/lib/almanax";
import { themeForDay, DEFAULT_DAY_THEME } from "@/lib/progression";
import { checkAlmanax } from "@/app/api/_lib/award";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  const day = gameDay(new Date(), hunter.timezone, hunter.dayRolloverHour);
  let state: AlmanaxState | null = null;
  try { state = hunter.almanaxJson ? JSON.parse(hunter.almanaxJson) : null; } catch { state = null; }
  const st = almanaxStateFor(day, state);
  const offer = OFFERING_BY_KEY[st.offerKey] || offeringFor(day);
  const weekday = new Date(day + "T12:00:00").getDay();
  let themeMap: Record<number, string> = DEFAULT_DAY_THEME;
  try { if (hunter.dayThemeJson) themeMap = JSON.parse(hunter.dayThemeJson); } catch {}
  const inv = await prisma.inventoryItem.findMany({ where: { hunterId: hunter.id } });
  const owned = new Set(inv.map((i) => i.itemKey));
  return NextResponse.json({
    day,
    offering: { key: offer.key, title: offer.title, desc: offer.desc, mereons: offer.mereons, gold: offer.gold, done: st.done },
    themeCode: themeForDay(weekday, themeMap),
    mereons: hunter.mereons,
    temple: TEMPLE_ITEMS.map((t) => ({ ...t, owned: owned.has(t.key) })),
  });
}

// POST { action: "claim" } — tente de valider l'offrande (vérifiée côté serveur).
// POST { action: "buy", key } — achat au Temple en Méréons.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; key?: string };
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });

  if (b.action === "claim") {
    const reward = await checkAlmanax(hunter.id);
    if (!reward) return NextResponse.json({ error: "Offrande pas encore accomplie (ou déjà validée)." }, { status: 400 });
    return NextResponse.json({ ok: true, reward });
  }

  if (b.action === "buy") {
    const def = TEMPLE_ITEMS.find((t) => t.key === b.key);
    if (!def) return NextResponse.json({ error: "Objet inconnu au Temple" }, { status: 400 });
    const existing = await prisma.inventoryItem.findUnique({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: def.key } } });
    if (existing) return NextResponse.json({ error: "Déjà possédé." }, { status: 400 });
    if (hunter.mereons < def.cost) return NextResponse.json({ error: "Pas assez de Méréons (" + def.cost + " ❖ requis)." }, { status: 400 });
    await prisma.$transaction([
      prisma.hunter.update({ where: { id: hunter.id }, data: { mereons: hunter.mereons - def.cost } }),
      prisma.inventoryItem.create({ data: { hunterId: hunter.id, itemKey: def.key } }),
    ]);
    return NextResponse.json({ ok: true, mereons: hunter.mereons - def.cost });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
