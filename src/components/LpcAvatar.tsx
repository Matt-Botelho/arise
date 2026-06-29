import { BASE_LAYERS, ITEM_BY_KEY, EQUIP_SLOTS, fileFor, type Equipped } from "@/lib/lpc-items";

export default function LpcAvatar({ equipped, size = 192 }: { equipped: Equipped; size?: number }) {
  const scale = size / 64;
  const layers: { file: string; z: number }[] = [];
  for (const b of BASE_LAYERS) { const f = fileFor(b); if (f) layers.push({ file: f, z: b.zPos }); }
  for (const slot of EQUIP_SLOTS) {
    const sel = equipped[slot];
    if (!sel || !sel.key) continue;
    const item = ITEM_BY_KEY[sel.key];
    if (!item) continue;
    const f = fileFor(item, sel.color);
    if (f) layers.push({ file: f, z: item.zPos });
  }
  layers.sort((a, b) => a.z - b.z);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
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
