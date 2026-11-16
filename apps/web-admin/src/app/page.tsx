'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminKPIs } from '@echrimheni/database';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { formatCurrency } from '@/lib/utils';
import {
  UserCheck,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface KPIData {
  totalUsers: number;
  pendingExperts: number;
  approvedExperts: number;
  activeMissions: number;
  completedMissions: number;
  totalCommission: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminKPIs();
      setKpis(data);
    } catch (err: any) {
      console.error('[Dashboard] Erreur chargement KPIs :', err.message);
      setError('Impossible de charger les données du tableau de bord. Vérifiez la connexion Supabase.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Chargement du tableau de bord..." />;
  if (error || !kpis) return <ErrorState title="Erreur de connexion" message={error || 'Données indisponibles.'} onRetry={loadKPIs} />;

  return (
    <div className="space-y-6">
      {/* Data source indicator */}
      <div className="flex items-center gap-2">
        <Badge variant="success" dot>
          Données Supabase en temps réel
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Experts en Attente"
          value={kpis.pendingExperts}
          subtitle="Dossiers RC et pièces d'identité soumis"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <KpiCard
          title="Experts Vérifiés"
          value={kpis.approvedExperts}
          subtitle="Badge Expert Vérifié attribué"
          icon={<UserCheck className="h-6 w-6" />}
        />
        <KpiCard
          title="Missions Réalisées"
          value={kpis.completedMissions}
          subtitle="Inspections terminées et rapports publiés"
          icon={<ClipboardCheck className="h-6 w-6" />}
        />
        <KpiCard
          title="Commission Plateforme"
          value={formatCurrency(kpis.totalCommission)}
          subtitle="15% sur chaque inspection"
          icon={<TrendingUp className="h-6 w-6" />}
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expert Verification Queue */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Vérification des Dossiers</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Contrôle d&apos;identité, validité du RC et cohérence activité/spécialité
              </p>
            </div>
            <Link href="/experts">
              <Button variant="ghost" size="sm">
                Voir tout <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>

          {kpis.pendingExperts > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {kpis.pendingExperts} dossier(s) en attente d&apos;examen
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Documents RC et pièces d&apos;identité soumis par les candidats experts
                </p>
              </div>
              <Link href="/experts">
                <Button variant="warning" size="sm">Examiner</Button>
              </Link>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">Tous les dossiers sont traités</p>
            </div>
          )}
        </Card>

        {/* Audit & Traceability */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Traçabilité &amp; Audit Légal</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Historique immuable des actions administratives
              </p>
            </div>
            <Link href="/audit">
              <Button variant="ghost" size="sm">
                Journal <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Toutes les décisions (approbation, refus motivé, suspension) sont consignées avec horodatage et identifiant de l&apos;agent.
            </p>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-sm font-medium text-slate-500">Utilisateurs Inscrits</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.totalUsers}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm font-medium text-slate-500">Missions Actives</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.activeMissions}</p>
          <p className="text-xs text-slate-400 mt-1">Sur le terrain</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm font-medium text-slate-500">Verticales Actives</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">3</p>
          <p className="text-xs text-slate-400 mt-1">Automobile · Téléphone · Électroménager</p>
        </Card>
      </div>
    </div>
  );
}
