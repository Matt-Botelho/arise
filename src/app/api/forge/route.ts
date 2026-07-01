// Forge des Ombres : briser un doublon → Rune ; appliquer une Rune → exo borné (gamble affiché).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { breakResult, parseRunes, parseExo, rollForge, applyRune, canReceiveRune, RUNE_LABEL, FORGE_ODDS, type RuneType } from "@/lib/forge";

export const dynamic = "force-dynamic";

export async function GET() {
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  return NextResponse.json({ runes: parseRunes(hunter.runesJson), odds: FORGE_ODDS });
}

// POST { action: "break", itemKey } — sacrifie UN doublon, crédite des runes.
// POST { action: "apply", itemKey, rune } — tente d'appliquer une rune (succès/neutre/échec).
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; itemKey?: string; rune?: string };
  const hunter = await prisma.hunter.findFirst();
  if (!hunter) return NextResponse.json({ error: "Aucun chasseur" }, { status: 404 });
  if (!b.itemKey) return NextResponse.json({ error: "itemKey requis" }, { status: 400 });
  const inv = await prisma.inventoryItem.findUnique({ where: { hunterId_itemKey: { hunterId: hunter.id, itemKey: b.itemKey } } });
  if (!inv) return NextResponse.json({ error: "Objet non possédé" }, { status: 404 });
  const runes = parseRunes(hunter.runesJson);

  if (b.action === "break") {
    if (inv.qty < 2) return NextResponse.json({ error: "Il faut un doublon pour briser (tu gardes toujours 1 exemplaire)." }, { status: 400 });
    const res = breakResult(b.itemKey);
    if (!res) return NextResponse.json({ error: "Objet inconnu" }, { status: 400 });
    runes[res.type] += res.count;
    await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty - 1 } }),
      prisma.hunter.update({ where: { id: hunter.id }, data: { runesJson: JSON.stringify(runes) } }),
    ]);
    return NextResponse.json({ ok: true, gained: { type: res.type, label: RUNE_LABEL[res.type], count: res.count }, runes });
  }

  if (b.action === "apply") {
    const type = b.rune as RuneType;
    if (!["xp", "gold", "loot"].includes(type)) return NextResponse.json({ error: "Rune inconnue" }, { status: 400 });
    if ((runes[type] || 0) < 1) return NextResponse.json({ error: "Tu n'as pas cette rune." }, { status: 400 });
    const exo = parseExo(inv.exoJson);
    if (!canReceiveRune(exo, type)) return NextResponse.json({ error: "Cet objet a atteint la limite pour cette stat (+5)." }, { status: 400 });
    const outcome = rollForge();
    // Rune consommée sauf résultat neutre.
    if (outcome !== "neutral") runes[type] -= 1;
    const applied = applyRune(exo, type, outcome);
    await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: inv.id }, data: { exoJson: JSON.stringify(applied.exo) } }),
      prisma.hunter.update({ where: { id: hunter.id }, data: { runesJson: JSON.stringify(runes) } }),
    ]);
    return NextResponse.json({ ok: true, outcome, exo: applied.exo, runes });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
