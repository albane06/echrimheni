'use client';

import { useState, useEffect } from 'react';
import {
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@echrimheni/database';
import { Card, Button, Badge, Tabs, EmptyState, LoadingState, ErrorState } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { Bell, UserCheck, ClipboardCheck, CreditCard, PauseCircle, Check, Info } from 'lucide-react';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

function normalizeNotifications(data: any[]): NotificationRow[] {
  return data.map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    created_at: n.created_at,
    read: n.read_at !== null && n.read_at !== undefined,
  }));
}

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; iconColor: string }> = {
  VERIFICATION_APPROVED: { icon: <UserCheck className="h-5 w-5" />, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  VERIFICATION_REJECTED: { icon: <UserCheck className="h-5 w-5" />, bg: 'bg-red-50', iconColor: 'text-red-600' },
  VERIFICATION_SUSPENDED: { icon: <PauseCircle className="h-5 w-5" />, bg: 'bg-red-50', iconColor: 'text-red-600' },
  BOOKING_STATUS_CHANGED: { icon: <ClipboardCheck className="h-5 w-5" />, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  PAYMENT_SUCCESS: { icon: <CreditCard className="h-5 w-5" />, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  MISSION_PAID: { icon: <CreditCard className="h-5 w-5" />, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
};

function configFor(type: string) {
  return typeConfig[type] || { icon: <Info className="h-5 w-5" />, bg: 'bg-slate-100', iconColor: 'text-slate-500' };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminNotifications();
      setNotifications(normalizeNotifications(data));
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // Erreur silencieuse : l'état local reste inchangé, un rechargement réessaiera.
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // Erreur silencieuse : voir ci-dessus.
    }
  };

  const filtered = activeTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  if (loading) return <LoadingState message="Chargement des notifications..." />;
  if (error) return <ErrorState title="Erreur de chargement" message={error} onRetry={loadNotifications} />;

  return (
    <div className="space-y-6">
      <Badge variant="success" dot>Données Supabase</Badge>

      <div className="flex items-center justify-between">
        <Tabs
          tabs={[
            { label: 'Toutes', value: 'all', count: notifications.length },
            { label: 'Non lues', value: 'unread', count: unreadCount },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" icon={<Check className="h-4 w-4" />} onClick={() => void markAllAsRead()}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title={activeTab === 'unread' ? 'Tout est lu !' : 'Aucune notification'}
          description={activeTab === 'unread' ? 'Vous avez lu toutes vos notifications.' : 'Les notifications apparaîtront ici.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const config = configFor(notif.type);
            return (
              <Card
                key={notif.id}
                className={`cursor-pointer transition hover:shadow-md ${!notif.read ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
                padding="sm"
              >
                <div className="flex items-start gap-4" onClick={() => void markAsRead(notif.id)}>
                  <div className={`h-10 w-10 rounded-lg ${config.bg} flex items-center justify-center ${config.iconColor} shrink-0`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notif.read && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                      <h4 className={`text-sm ${!notif.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDateTime(notif.created_at)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
