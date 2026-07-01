import { BASE_LAYERS, ITEM_BY_KEY, fileFor } from "@/lib/lpc-items";

// Mini-personnage portant UNE pièce — pour visualiser un skin dans les grilles.
export default function LpcItemThumb({ itemKey, color, size = 52 }: { itemKey: string; color?: string | null; size?: number }) {
  const item = ITEM_BY_KEY[itemKey];
  const scale = size / 64;
  const layers: { file: string; z: number }[] = [];
  for (const b of BASE_LAYERS) { const f = fileFor(b); if (f) layers.push({ file: f, z: b.zPos }); }
  if (item) { const f = fileFor(item, color ?? item.colors?.[0]?.name); if (f) layers.push({ file: f, z: item.zPos }); }
  layers.sort((a, b) => a.z - b.z);
  return (
    <div style={{ position: "relative", width: size, height: size, overflow: "hidden" }}>
      {layers.map((l, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={l.file} alt="" style={{
          position: "absolute", left: 0, top: 0, width: 64, height: 64,
          transform: "scale(" + scale + ")", transformOrigin: "top left",
          imageRendering: "pixelated", zIndex: i,
        }} />
      ))}
    </div>
  );
}
