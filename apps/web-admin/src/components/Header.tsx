'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAdminAuth } from './AdminGuard';
import { getInitials } from '@/lib/utils';

const routeTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Tableau de bord', description: 'Vue d\'ensemble de la plateforme EchriMheni' },
  '/experts': { title: 'Gestion des Experts', description: 'Vérification et suivi des candidatures' },
  '/missions': { title: 'Missions', description: 'Suivi des inspections en cours et terminées' },
  '/reports': { title: 'Rapports', description: 'Consultation des rapports d\'inspection' },
  '/payments': { title: 'Paiements', description: 'Suivi financier et commissions' },
  '/notifications': { title: 'Notifications', description: 'Centre de notifications' },
  '/audit': { title: 'Journal d\'audit', description: 'Traçabilité des actions administratives' },
  '/settings': { title: 'Paramètres', description: 'Configuration de la plateforme' },
};

export function Header() {
  const pathname = usePathname();
  const { adminEmail } = useAdminAuth();

  // Find matching route (handles dynamic routes like /experts/[id])
  const matchedRoute = Object.entries(routeTitles).find(([path]) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  });

  const { title, description } = matchedRoute?.[1] || { title: 'EchriMheni', description: '' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-700">
              {adminEmail ? getInitials(adminEmail.split('@')[0]) : 'AD'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900">Administrateur</p>
            <p className="text-xs text-slate-500">{adminEmail ?? 'Session requise'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
