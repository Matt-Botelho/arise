import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ARISE — Le Système",
  description: "Ta vie en RPG façon Solo Leveling",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#05080f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-system-bg font-mono text-system-text antialiased">
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 border-t border-system-border/40 bg-system-panel/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl text-[13px]">
            <Link href="/" className="flex-1 py-4 text-center uppercase tracking-widest hover:text-system-accent">Statut</Link>
            <Link href="/quetes" className="flex-1 py-4 text-center uppercase tracking-widest hover:text-system-accent">Quêtes</Link>
            <Link href="/boutique" className="flex-1 py-4 text-center uppercase tracking-widest hover:text-system-accent">Boutique</Link>
            <Link href="/reglages" className="flex-1 py-4 text-center uppercase tracking-widest hover:text-system-accent">Réglages</Link>
          </div>
        </nav>
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});}" }} />
      </body>
    </html>
  );
}
