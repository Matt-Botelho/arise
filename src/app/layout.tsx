import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ARISE — Le Système",
  description: "Ta vie en RPG façon Solo Leveling",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#05080f" };

const links: [string, string][] = [
  ["/", "Statut"],
  ["/quetes", "Quêtes"],
  ["/objectifs", "Objectifs"],
  ["/donjons", "Donjons"],
  ["/boutique", "Boutique"],
  ["/stats", "Stats"],
  ["/reglages", "Réglages"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-system-bg font-mono text-system-text antialiased">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 lg:px-8">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 border-t border-system-border/40 bg-system-panel/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl overflow-x-auto">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="min-w-[58px] flex-1 shrink-0 py-3 text-center text-[10px] uppercase tracking-wide hover:text-system-accent">
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});}" }} />
      </body>
    </html>
  );
}
