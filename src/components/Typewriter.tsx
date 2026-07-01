"use client";
import { useEffect, useState } from "react";

// Texte frappé caractère par caractère, façon fenêtre du Système.
export default function Typewriter({ text, speed = 18, className = "" }: { text: string; speed?: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span className={className}>{text.slice(0, n)}{n < text.length && <span className="tw-caret">▍</span>}</span>;
}
