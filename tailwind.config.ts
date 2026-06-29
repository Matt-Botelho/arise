import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        system: {
          bg: "#05080f",
          panel: "#0a1424",
          border: "#1f6feb",
          glow: "#3b9bff",
          text: "#bfe0ff",
          accent: "#38e1ff",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        system: "0 0 20px rgba(59,155,255,0.35), inset 0 0 20px rgba(59,155,255,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
