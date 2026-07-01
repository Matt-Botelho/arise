import { BASE_LAYERS, ITEM_BY_KEY, fileFor } from "@/lib/lpc-items";

// Mini-personnage portant UNE pièce — cadré/centré sur le corps (le sprite occupe x17-47, y15-62).
const CX = 32;   // centre horizontal du personnage
const CY = 36;   // centre vertical (inclut casques/cheveux en haut, pieds en bas)
const V = 54;    // fenêtre de visualisation (px du sprite) — plus petit = plus zoomé

export default function LpcItemThumb({ itemKey, color, size = 56 }: { itemKey: string; color?: string | null; size?: number }) {
  const item = ITEM_BY_KEY[itemKey];
  const scale = size / V;
  const layers: { file: string; z: number }[] = [];
  for (const b of BASE_LAYERS) { const f = fileFor(b); if (f) layers.push({ file: f, z: b.zPos }); }
  if (item) { const f = fileFor(item, color ?? item.colors?.[0]?.name); if (f) layers.push({ file: f, z: item.zPos }); }
  layers.sort((a, b) => a.z - b.z);
  const left = size / 2 - CX * scale;
  const top = size / 2 - CY * scale;
  return (
    <div style={{ position: "relative", width: size, height: size, overflow: "hidden" }}>
      {layers.map((l, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={l.file} alt="" style={{
          position: "absolute", left, top, width: 64, height: 64,
          transform: "scale(" + scale + ")", transformOrigin: "top left",
          imageRendering: "pixelated", zIndex: i,
        }} />
      ))}
    </div>
  );
}
