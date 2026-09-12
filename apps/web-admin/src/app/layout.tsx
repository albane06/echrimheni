import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '../components/Navigation';

export const metadata: Metadata = {
  title: 'EchriMheni — Administration & Vérification Experts',
  description: 'Plateforme algérienne d inspection et diagnostic pré-achat'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
          EchriMheni MVP v1.0 • Module d Administration et Sécurité
        </footer>
      </body>
    </html>
  );
}