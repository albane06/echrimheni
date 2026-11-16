'use client';

import { Card, CardTitle, Badge } from '@/components/ui';
import { useAdminAuth } from '@/components/AdminGuard';
import { User, Shield, Settings as SettingsIcon, Database, Percent } from 'lucide-react';

export default function SettingsPage() {
  const { adminEmail, adminName } = useAdminAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Admin Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <CardTitle>Profil Administrateur</CardTitle>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Nom</p>
            <p className="font-medium text-slate-900">{adminName ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p className="font-medium text-slate-900">{adminEmail ?? 'Session requise'}</p>
          </div>
          <div>
            <p className="text-slate-500">Rôle</p>
            <Badge variant="info">ADMIN</Badge>
          </div>
          <div>
            <p className="text-slate-500">Dernière connexion</p>
            <p className="font-medium text-slate-900">N/A</p>
          </div>
        </div>
      </Card>

      {/* Platform */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Percent className="h-5 w-5 text-emerald-600" />
          </div>
          <CardTitle>Commission Plateforme</CardTitle>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Taux de commission</span>
            <span className="font-bold text-emerald-600">15%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Reversement expert</span>
            <span className="font-bold text-blue-600">85%</span>
          </div>
          <p className="text-xs text-slate-400 italic">
            La répartition des commissions est définie côté serveur (RPC) et ne peut pas être modifiée depuis le frontend.
          </p>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <CardTitle>Sécurité</CardTitle>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Row Level Security (RLS)</span>
            <Badge variant="success">Activé</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Storage privé (CNI / RC)</span>
            <Badge variant="success">Activé</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Authentification</span>
            <Badge variant="success">Supabase Auth</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Paiement sandbox</span>
            <Badge variant="info">Idempotent</Badge>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Database className="h-5 w-5 text-slate-600" />
          </div>
          <CardTitle>Système</CardTitle>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Version</span>
            <span className="font-mono font-medium text-slate-900">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Verticales actives</span>
            <span className="font-medium text-slate-900">Automobile, Téléphone, Électroménager</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-600">Framework</span>
            <span className="font-medium text-slate-900">Next.js 15 + Supabase</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
