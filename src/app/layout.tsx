import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ARISE — Le Système",
  description: "Ta vie en RPG façon Solo Leveling",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ARISE" },
};

export const viewport: Viewport = { themeColor: "#05080f" };

const links: [string, string][] = [
  ["/", "QG"],
  ["/quetes", "Quêtes"],
  ["/objectifs", "Aventure"],
  ["/donjons", "Donjons"],
  ["/boutique", "Boutique"],
  ["/statut", "Statut"],
  ["/stats", "Stats"],
  ["/configuration", "⚙ Config"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-system-bg font-mono text-system-text antialiased">
        {/* Poussière d'ambiance : particules dérivant lentement (décoratif, très léger) */}
        <div aria-hidden>
          {[8, 22, 37, 51, 66, 79, 91].map((left, i) => (
            <span key={i} className="dust" style={{ left: left + "%", animationDelay: i * 2.1 + "s", animationDuration: 12 + (i % 3) * 4 + "s" }} />
          ))}
        </div>
        <div className="relative mx-auto max-w-[1400px] px-4 pb-24 pt-6 md:px-6 lg:px-10">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 border-t border-system-border/40 bg-system-panel/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] overflow-x-auto">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="min-w-[58px] flex-1 shrink-0 py-3 text-center text-[11px] uppercase tracking-wide hover:text-system-accent">
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
