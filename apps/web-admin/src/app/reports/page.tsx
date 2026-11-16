'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllReports } from '@echrimheni/database';
import { Badge, DataTable, EmptyState, LoadingState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { FileText } from 'lucide-react';

type ReportRow = {
  id: string;
  booking_id: string;
  mission: string;
  expert: string;
  score: number;
  date: string;
  published: boolean;
};

function normalizeReports(data: any[]): ReportRow[] {
  return data.map((r: any) => ({
    id: r.id,
    booking_id: r.booking_id,
    mission: r.bookings?.listings?.title
      || `${r.bookings?.listings?.make || ''} ${r.bookings?.listings?.model || ''}`.trim()
      || 'Mission',
    expert: r.bookings?.expert?.profiles?.full_name || 'Expert',
    score: r.score,
    date: r.created_at,
    published: r.is_published,
  }));
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllReports();
      setReports(normalizeReports(data));
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les rapports.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Chargement des rapports..." />;
  if (error) return <ErrorState title="Erreur de chargement" message={error} onRetry={loadReports} />;

  return (
    <div className="space-y-6">
      <Badge variant="success" dot>Données Supabase</Badge>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Aucun rapport disponible"
          description="Les rapports apparaîtront ici lorsque des inspections seront terminées."
        />
      ) : (
        <DataTable<ReportRow>
          columns={[
            { key: 'mission', header: 'Mission / Objet', render: (r) => <span className="font-semibold text-slate-900">{r.mission}</span> },
            { key: 'expert', header: 'Expert', render: (r) => <span className="text-slate-600">{r.expert}</span> },
            { key: 'score', header: 'Score', render: (r) => (
              <span className={`font-bold ${r.score >= 75 ? 'text-emerald-600' : r.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {r.score}/100
              </span>
            ) },
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDate(r.date)}</span> },
            { key: 'published', header: 'Publication', render: (r) => (
              <Badge variant={r.published ? 'success' : 'warning'}>{r.published ? 'Publié' : 'En attente'}</Badge>
            ) },
          ]}
          data={reports}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => router.push(`/reports/${r.id}`)}
          emptyMessage="Aucun rapport trouvé."
        />
      )}
    </div>
  );
}
