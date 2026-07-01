"use client";
// L'Ombre-compagnon : silhouette SVG animée, 4 stades d'évolution.
// Nourrie (journée parfaite récente) = yeux brillants + aura ; sinon assombrie, jamais morte.

type Props = { stageKey: string; fed: boolean; size?: number };

export default function ShadowCompanion({ stageKey, fed, size = 120 }: Props) {
  const eye = fed ? "#b06bff" : "#3a3f52";
  const bodyOpacity = fed ? 0.95 : 0.55;
  const glow = fed ? "drop-shadow(0 0 10px rgba(176,107,255,0.6))" : "none";
  return (
    <div className="shadow-float" style={{ width: size, height: size, filter: glow }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        {stageKey === "naissante" && (
          <g opacity={bodyOpacity}>
            <ellipse cx="32" cy="46" rx="16" ry="10" fill="#0b0e1c" />
            <ellipse cx="32" cy="38" rx="11" ry="12" fill="#11152b" />
            <circle cx="28" cy="36" r="2.2" fill={eye} />
            <circle cx="36" cy="36" r="2.2" fill={eye} />
          </g>
        )}
        {stageKey === "loup" && (
          <g opacity={bodyOpacity}>
            <path d="M10 48 Q14 34 26 32 L30 24 L34 30 Q46 28 52 36 L56 44 Q50 50 40 50 L18 50 Z" fill="#0b0e1c" />
            <path d="M28 26 L30 18 L34 25 Z" fill="#0b0e1c" />
            <path d="M35 26 L39 20 L40 27 Z" fill="#0b0e1c" />
            <circle cx="45" cy="37" r="2" fill={eye} />
            <circle cx="50" cy="39" r="1.6" fill={eye} />
            <path d="M12 48 Q6 44 8 38" stroke="#0b0e1c" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        )}
        {stageKey === "garou" && (
          <g opacity={bodyOpacity}>
            <path d="M24 58 L26 42 Q20 38 22 28 Q24 18 32 16 Q40 18 42 28 Q44 38 38 42 L40 58 L34 58 L33 48 L31 48 L30 58 Z" fill="#0b0e1c" />
            <path d="M26 18 L24 10 L30 15 Z" fill="#0b0e1c" />
            <path d="M38 18 L40 10 L34 15 Z" fill="#0b0e1c" />
            <circle cx="28.5" cy="26" r="2.2" fill={eye} />
            <circle cx="35.5" cy="26" r="2.2" fill={eye} />
            <path d="M20 34 Q12 32 10 26" stroke="#0b0e1c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M44 34 Q52 32 54 26" stroke="#0b0e1c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </g>
        )}
        {stageKey === "monarque" && (
          <g opacity={bodyOpacity}>
            <path d="M22 60 L25 40 Q18 36 20 24 Q23 12 32 10 Q41 12 44 24 Q46 36 39 40 L42 60 L35 60 L33.5 48 L30.5 48 L29 60 Z" fill="#0a0c18" />
            <path d="M25 12 L22 2 L29 9 Z" fill="#0a0c18" />
            <path d="M39 12 L42 2 L35 9 Z" fill="#0a0c18" />
            <path d="M26 8 L28 4 L30 8 L32 3 L34 8 L36 4 L38 8 Z" fill={fed ? "#ffcf4d" : "#4a4433"} />
            <circle cx="28" cy="22" r="2.4" fill={eye} />
            <circle cx="36" cy="22" r="2.4" fill={eye} />
            <path d="M18 32 Q8 30 6 22" stroke="#0a0c18" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M46 32 Q56 30 58 22" stroke="#0a0c18" strokeWidth="4" fill="none" strokeLinecap="round" />
            {fed && <ellipse cx="32" cy="61" rx="16" ry="2.5" fill="#b06bff" opacity="0.35" />}
          </g>
        )}
      </svg>
    </div>
  );
}
