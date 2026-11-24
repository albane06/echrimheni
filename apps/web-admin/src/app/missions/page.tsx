'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllMissions } from '@echrimheni/database';
import { Badge, SearchInput, Tabs, DataTable, LoadingState, ErrorState, Button } from '@/components/ui';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';

type MissionRow = {
  id: string;
  title: string;
  category_name: string;
  buyer_name: string;
  expert_name: string;
  status: string;
  score: number | null;
  price: number;
  date: string;
};

function normalizeMissions(data: any[]): MissionRow[] {
  return data.map((m: any) => {
    const realEstate = Array.isArray(m.listings?.listing_real_estate)
      ? m.listings.listing_real_estate[0]
      : m.listings?.listing_real_estate;
    const catCode = m.listings?.categories?.code || (realEstate?.domain ? String(realEstate.domain).toLowerCase() : null);
    const catName = m.listings?.categories?.name || (catCode === 'terrain' ? 'Terrain & Foncier' : catCode === 'immobilier' ? 'Immobilier & Bâti' : 'Automobile');
    return {
      id: m.id,
      title: m.listings?.title || `${m.listings?.make || ''} ${m.listings?.model || ''} (${m.listings?.year || ''})`.trim() || 'Mission sans titre',
      category_name: catName,
      buyer_name: m.buyer?.full_name || 'Acheteur',
      expert_name: m.expert?.profiles?.full_name || 'Expert',
      status: m.status,
      score: m.reports?.[0]?.score ?? null,
      price: m.price_total || 0,
      date: m.created_at,
    };
  });
}

const statusTabs = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'En cours', value: 'IN_PROGRESS' },
  { label: 'Terminées', value: 'COMPLETED' },
  { label: 'Litiges', value: 'DISPUTED' },
  { label: 'Annulées', value: 'CANCELLED' },
];

export default function MissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [expiring, setExpiring] = useState(false);
  const [expireResult, setExpireResult] = useState<string | null>(null);

  const handleExpireStale = async () => {
    setExpiring(true);
    setExpireResult(null);
    try {
      const res = await fetch('/api/admin/expire-bookings', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Expiration impossible.');
      const count = (json as any)?.expired_count ?? 0;
      setExpireResult(`${count} demande(s) expirée(s).`);
      await loadMissions();
    } catch (err: any) {
      setExpireResult(err?.message || 'Expiration impossible.');
    } finally {
      setExpiring(false);
    }
  };

  useEffect(() => { loadMissions(); }, []);

  const loadMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMissions();
      setMissions(normalizeMissions(data));
    } catch (err: any) {
      console.error('[Missions] Erreur :', err.message);
      setError('Impossible de charger les missions.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = missions
    .filter(m => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'IN_PROGRESS') return ['SCHEDULED', 'IN_PROGRESS', 'INSPECTION_COMPLETED'].includes(m.status);
      if (activeTab === 'COMPLETED') return m.status === 'COMPLETED';
      if (activeTab === 'CANCELLED') return m.status === 'CANCELLED';
      if (activeTab === 'DISPUTED') return m.status === 'DISPUTED';
      return true;
    })
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.buyer_name.toLowerCase().includes(search.toLowerCase()) || m.category_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingState message="Chargement des missions..." />;
  if (error) return <ErrorState message={error} onRetry={loadMissions} />;

  return (
    <div className="space-y-6">
      <Badge variant="success" dot>Données Supabase</Badge>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={statusTabs.map(t => ({
            ...t,
            count: t.value === 'ALL' ? missions.length : missions.filter(m => {
              if (t.value === 'IN_PROGRESS') return ['SCHEDULED', 'IN_PROGRESS', 'INSPECTION_COMPLETED'].includes(m.status);
              return m.status === t.value;
            }).length,
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par objet, catégorie ou acheteur..." className="w-80" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExpireStale()} loading={expiring}>
            Expirer les demandes périmées
          </Button>
        </div>
      </div>
      {expireResult && <p className="text-sm text-slate-600">{expireResult}</p>}

      <DataTable<MissionRow>
        columns={[
          { key: 'title', header: 'Mission / Objet', render: (r) => (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900">{r.title}</span>
              <span className="text-xs text-slate-500 font-medium">{r.category_name}</span>
            </div>
          ) },
          { key: 'buyer', header: 'Acheteur', render: (r) => <span className="text-slate-600">{r.buyer_name}</span> },
          { key: 'expert', header: 'Expert', render: (r) => <span className="text-slate-600">{r.expert_name}</span> },
          { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDate(r.date)}</span> },
          { key: 'status', header: 'Statut', render: (r) => <BookingStatusBadge status={r.status as any} /> },
          { key: 'score', header: 'Score', render: (r) => r.score !== null ? (
            <span className={`font-bold ${r.score >= 75 ? 'text-emerald-600' : r.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.score}/100</span>
          ) : <span className="text-slate-400">—</span> },
          { key: 'price', header: 'Prix', render: (r) => <span className="text-slate-600">{formatCurrency(r.price)}</span>, className: 'text-right' },
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => router.push(`/missions/${r.id}`)}
        emptyMessage="Aucune mission enregistrée."
      />
    </div>
  );
}