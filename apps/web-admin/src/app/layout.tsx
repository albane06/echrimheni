import type { Metadata } from 'next';
import './globals.css';
import { AdminAuthProvider } from '../components/AdminGuard';
import { ClientLayout } from '../components/ClientLayout';

export const metadata: Metadata = {
  title: 'EchriMheni — Administration & Vérification Experts',
  description: 'Plateforme algérienne d\'inspection et diagnostic pré-achat'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full bg-slate-50">
      <body className="min-h-full font-sans antialiased">
        <AdminAuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
