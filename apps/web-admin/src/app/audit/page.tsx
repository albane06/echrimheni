'use client';

import { useState, useEffect } from 'react';
import { getAuditLogs } from '@echrimheni/database';
import { Card, Badge, Tabs, DataTable, LoadingState, ErrorState } from '@/components/ui';
import { Timeline } from '@/components/ui/Timeline';
import { SearchInput } from '@/components/ui/Input';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle, XCircle, PauseCircle, Shield, UserPlus } from 'lucide-react';
import type { AdminAction } from '@echrimheni/shared';

function getActionConfig(actionType: string) {
  switch (actionType) {
    case 'EXPERT_APPROVED': return { label: 'Expert approuvé', variant: 'success' as const, icon: <CheckCircle className="h-3 w-3 text-white" /> };
    case 'EXPERT_REJECTED': return { label: 'Expert rejeté', variant: 'danger' as const, icon: <XCircle className="h-3 w-3 text-white" /> };
    case 'EXPERT_SUSPENDED': return { label: 'Expert suspendu', variant: 'warning' as const, icon: <PauseCircle className="h-3 w-3 text-white" /> };
    case 'USER_PROMOTED_TO_ADMIN': return { label: 'Admin promu', variant: 'info' as const, icon: <UserPlus className="h-3 w-3 text-white" /> };
    default: return { label: actionType, variant: 'default' as const, icon: <Shield className="h-3 w-3 text-white" /> };
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('timeline');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs();
      setLogs((data || []) as AdminAction[]);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger le journal d’audit.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l =>
    !search ||
    l.action_type.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_id.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())
  );

  const timelineEvents = filtered.map(l => {
    const config = getActionConfig(l.action_type);
    return {
      id: l.id,
      title: config.label,
      description: `Cible : ${l.target_type} (${l.target_id}) — ${JSON.stringify(l.details)}`,
      timestamp: l.created_at,
      variant: config.variant,
      icon: config.icon,
    };
  });

  if (loading) return <LoadingState message="Chargement du journal d'audit..." />;
  if (error) return <ErrorState title="Erreur de chargement" message={error} onRetry={loadLogs} />;

  return (
    <div className="space-y-6">
      <Badge variant="success" dot>Données Supabase</Badge>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { label: 'Chronologie', value: 'timeline' },
            { label: 'Tableau', value: 'table' },
          ]}
          activeTab={viewMode}
          onChange={setViewMode}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Filtrer les actions..." className="w-64" />
      </div>

      {viewMode === 'timeline' ? (
        <Card>
          <Timeline events={timelineEvents} />
        </Card>
      ) : (
        <DataTable<AdminAction>
          columns={[
            { key: 'date', header: 'Date / Heure', render: (r) => <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span> },
            { key: 'admin', header: 'Administrateur', render: (r) => <span className="font-medium text-slate-900">{r.admin_id}</span> },
            { key: 'action', header: 'Action', render: (r) => {
              const config = getActionConfig(r.action_type);
              return <Badge variant={config.variant}>{config.label}</Badge>;
            }},
            { key: 'target', header: 'Cible', render: (r) => <span className="text-slate-600">{r.target_type} ({r.target_id})</span> },
            { key: 'details', header: 'Détails', render: (r) => <span className="text-xs text-slate-400 font-mono">{JSON.stringify(r.details)}</span> },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyMessage="Aucune action d'audit enregistrée."
        />
      )}
    </div>
  );
}
