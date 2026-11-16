'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from './ui/Toast';
import { useAdminAuth } from './AdminGuard';
import { LoadingState, ErrorState } from './ui/States';

const PUBLIC_PATHS = ['/login'];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isAuthenticated, isLoading, error, logout, refresh } = useAdminAuth();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublicPath) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-slate-50">{children}</div>
      </ToastProvider>
    );
  }

  if (isLoading) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <LoadingState message="Vérification de la session administrateur..." />
        </div>
      </ToastProvider>
    );
  }

  // P1 — Le contenu Admin n'est rendu que si authenticated === true ET role === ADMIN.
  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <ErrorState
              title="Session requise"
              message={error ?? 'Connectez-vous avec un compte administrateur pour accéder au back-office.'}
            />
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Aller à la connexion
              </Link>
              <button
                onClick={() => void refresh()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </ToastProvider>
    );
  }

  if (!isAdmin) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <ErrorState
              title="Accès réservé aux administrateurs"
              message="Votre compte est authentifié mais ne possède pas le rôle ADMIN."
              onRetry={() => router.refresh()}
            />
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Changer de compte
              </Link>
              <button
                onClick={() => void logout()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col">
          <Header />
          <main className="flex-1 p-6 bg-slate-50">
            {children}
          </main>
          <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 bg-white">
            EchriMheni v1.0 • Acheter en confiance. Faire vérifier avant de payer.
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
