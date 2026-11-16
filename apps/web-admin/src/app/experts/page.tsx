'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getExpertsAdmin } from '@echrimheni/database';
import { Badge, SearchInput, Tabs, DataTable, LoadingState, ErrorState } from '@/components/ui';
import { ExpertStatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import type { ExpertVerificationStatus } from '@echrimheni/shared';

type ExpertRow = {
  id: string;
  full_name: string;
  wilaya: string;
  specialties: string[];
  status: ExpertVerificationStatus;
  created_at: string;
};

function normalizeExperts(data: any[]): ExpertRow[] {
  return data.map((e: any) => ({
    id: e.expert_id || e.id,
    full_name: e.profiles?.full_name || 'Expert',
    wilaya: e.expert_profiles?.wilaya || 'N/A',
    specialties: e.expert_profiles?.specialties || [],
    status: (e.verification_status || 'PENDING') as ExpertVerificationStatus,
    created_at: e.created_at,
  }));
}

const statusTabs = [
  { label: 'Tous', value: 'ALL' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'Approuvés', value: 'APPROVED' },
  { label: 'Rejetés', value: 'REJECTED' },
  { label: 'Suspendus', value: 'SUSPENDED' },
];

export default function ExpertsPage() {
  const router = useRouter();
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    loadExperts();
  }, []);

  const loadExperts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpertsAdmin();
      setExperts(normalizeExperts(data));
    } catch (err: any) {
      console.error('[Experts] Erreur :', err.message);
      setError('Impossible de charger la liste des experts.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = experts
    .filter(e => activeTab === 'ALL' || e.status === activeTab)
    .filter(e => !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.wilaya.toLowerCase().includes(search.toLowerCase()));

  const tabsWithCounts = statusTabs.map(t => ({
    ...t,
    count: t.value === 'ALL' ? experts.length : experts.filter(e => e.status === t.value).length,
  }));

  if (loading) return <LoadingState message="Chargement des dossiers experts..." />;
  if (error) return <ErrorState message={error} onRetry={loadExperts} />;

  return (
    <div className="space-y-6">
      <Badge variant="success" dot>Données Supabase</Badge>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs tabs={tabsWithCounts} activeTab={activeTab} onChange={setActiveTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou wilaya..." className="w-64" />
      </div>

      <DataTable<ExpertRow>
        columns={[
          { key: 'name', header: 'Nom complet', render: (r) => <span className="font-semibold text-slate-900">{r.full_name}</span> },
          { key: 'wilaya', header: 'Wilaya', render: (r) => <span className="text-slate-600">{r.wilaya}</span> },
          { key: 'specialties', header: 'Spécialité', render: (r) => <span className="text-slate-600 capitalize">{r.specialties.join(', ') || '—'}</span> },
          { key: 'status', header: 'Statut', render: (r) => <ExpertStatusBadge status={r.status} /> },
          { key: 'date', header: 'Date soumission', render: (r) => <span className="text-slate-400 text-xs">{formatDate(r.created_at)}</span> },
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => router.push(`/experts/${r.id}`)}
        emptyMessage="Aucun expert ne correspond à vos critères de recherche."
      />
    </div>
  );
}
