// Effets sonores synthétisés via Web Audio API — aucun fichier binaire requis.
let enabled = true;
export function setSfxEnabled(v: boolean) { enabled = v; }
export function isSfxEnabled() { return enabled; }

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

type Tone = { f: number; t: number; d: number; type?: OscillatorType; g?: number };
function play(tones: Tone[]) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});
  const now = a.currentTime;
  for (const tn of tones) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = tn.type || "sine";
    osc.frequency.value = tn.f;
    const start = now + tn.t;
    const vol = tn.g ?? 0.14;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tn.d);
    osc.connect(gain).connect(a.destination);
    osc.start(start);
    osc.stop(start + tn.d + 0.03);
  }
}

export function playXp() { play([{ f: 660, t: 0, d: 0.12, type: "triangle" }, { f: 880, t: 0.06, d: 0.14, type: "triangle" }]); }
export function playLevelUp() { play([{ f: 523, t: 0, d: 0.18 }, { f: 659, t: 0.1, d: 0.18 }, { f: 784, t: 0.2, d: 0.22 }, { f: 1047, t: 0.32, d: 0.32 }]); }
export function playLoot(rarity?: string) {
  const base = rarity === "mythique" ? 1200 : rarity === "legendaire" ? 1000 : rarity === "epique" ? 850 : 720;
  play([{ f: base, t: 0, d: 0.1, type: "square", g: 0.07 }, { f: base * 1.5, t: 0.07, d: 0.16, type: "square", g: 0.07 }]);
}
export function playRankUp() { play([{ f: 392, t: 0, d: 0.25, g: 0.17 }, { f: 523, t: 0.12, d: 0.25, g: 0.17 }, { f: 659, t: 0.24, d: 0.3, g: 0.17 }, { f: 784, t: 0.36, d: 0.4, g: 0.19 }, { f: 1047, t: 0.5, d: 0.5, g: 0.19 }]); }
export function playObjective() { play([{ f: 587, t: 0, d: 0.16 }, { f: 880, t: 0.1, d: 0.22 }, { f: 1175, t: 0.24, d: 0.3 }]); }
