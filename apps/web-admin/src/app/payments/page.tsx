'use client';

import { useState, useEffect } from 'react';
import { getAllPayments, getPaymentKPIs } from '@echrimheni/database';
import { Card, CardTitle, Badge, DataTable, KpiCard, LoadingState, ErrorState } from '@/components/ui';
import { PaymentStatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, TrendingUp, ArrowDownRight, Clock, Wallet } from 'lucide-react';

type PaymentRow = {
  id: string;
  mission: string;
  amount: number;
  commission: number;
  expert_payout: number;
  method: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  date: string;
};

interface PaymentKPIs {
  totalRevenue: number;
  totalCommission: number;
  totalExpertPayout: number;
  pendingCount: number;
}

function normalizePayments(data: any[]): PaymentRow[] {
  return data.map((p: any) => {
    const booking = p.bookings;
    return {
      id: p.id,
      mission: booking?.listings?.title
        || `${booking?.listings?.make || ''} ${booking?.listings?.model || ''}`.trim()
        || 'Mission',
      amount: p.amount || 0,
      commission: booking?.commission_platform ?? Math.round((p.amount || 0) * 0.15),
      expert_payout: booking?.expert_payout ?? (p.amount || 0) - Math.round((p.amount || 0) * 0.15),
      method: p.method,
      status: p.status,
      date: p.created_at,
    };
  });
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [kpis, setKpis] = useState<PaymentKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, kpiData] = await Promise.all([getAllPayments(), getPaymentKPIs()]);
      setPayments(normalizePayments(data));
      setKpis(kpiData);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les paiements.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Chargement des paiements..." />;
  if (error || !kpis) return <ErrorState title="Erreur de chargement" message={error || 'Données indisponibles.'} onRetry={loadPayments} />;

  return (
    <div className="space-y-6">
      <Badge variant="success" dot>Données Supabase</Badge>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenus"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle="Volume total des paiements confirmés"
          icon={<CreditCard className="h-6 w-6" />}
        />
        <KpiCard
          title="Commission Plateforme"
          value={formatCurrency(kpis.totalCommission)}
          subtitle="15% sur chaque inspection"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <KpiCard
          title="Reversements Experts"
          value={formatCurrency(kpis.totalExpertPayout)}
          subtitle="85% reversés aux experts"
          icon={<ArrowDownRight className="h-6 w-6" />}
        />
        <KpiCard
          title="En Attente"
          value={kpis.pendingCount}
          subtitle="Paiements non encore confirmés"
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {/* Commission Breakdown Visual */}
      <Card>
        <CardTitle>Répartition des Commissions</CardTitle>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 rounded-full overflow-hidden bg-slate-100 flex">
              <div className="bg-emerald-500 h-full" style={{ width: '15%' }} />
              <div className="bg-blue-500 h-full" style={{ width: '85%' }} />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Plateforme — 15%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600">Expert — 85%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Wallet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Aucun paiement enregistré.</p>
            <p className="text-xs text-slate-400 mt-1">Les paiements apparaîtront ici lorsqu&apos;ils seront confirmés.</p>
          </div>
        </Card>
      ) : (
        <DataTable<PaymentRow>
          columns={[
            { key: 'mission', header: 'Mission', render: (r) => <span className="font-semibold text-slate-900 text-xs">{r.mission}</span> },
            { key: 'amount', header: 'Montant Total', render: (r) => <span className="text-slate-900 font-medium">{formatCurrency(r.amount)}</span> },
            { key: 'commission', header: 'Commission (15%)', render: (r) => <span className="text-emerald-600 font-medium">{formatCurrency(r.commission)}</span> },
            { key: 'expert', header: 'Expert (85%)', render: (r) => <span className="text-blue-600 font-medium">{formatCurrency(r.expert_payout)}</span> },
            { key: 'method', header: 'Méthode', render: (r) => <Badge variant="info">{r.method}</Badge> },
            { key: 'status', header: 'Statut', render: (r) => <PaymentStatusBadge status={r.status} /> },
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDate(r.date)}</span> },
          ]}
          data={payments}
          keyExtractor={(r) => r.id}
          emptyMessage="Aucun paiement enregistré."
        />
      )}
    </div>
  );
}
