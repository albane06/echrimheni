/**
 * P7.2/P7.10 — Shell buyer : 4 onglets persistants + vues empilées
 * (détail, création guidée/héritée, paiement). Navigation d'état uniquement.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, I18nManager } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { BuyerScreen } from './BuyerScreen';
import { CreateInspectionScreen } from './CreateInspectionScreen';
import { PaymentScreen } from './PaymentScreen';
import { HomeScreen } from './HomeScreen';
import { ReportsScreen } from './ReportsScreen';
import { RequestDetailScreen } from './RequestDetailScreen';
import { RequestsScreen } from './RequestsScreen';
import { ProfileScreen } from './ProfileScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { Header, TabBar, type TabKey } from '../components/ui/Chrome';
import { useBuyerAuth } from '../auth/BuyerAuthContext';
import { getAdminNotifications } from '@echrimheni/database';
import { colors, spacing } from '../theme/tokens';
import { useLanguage } from '../i18n';

function BackRow({ onBack, label }: { onBack: () => void; label: string }) {
  const { T } = useLanguage();
  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.screen, backgroundColor: colors.bg.card }}
    >
      <ArrowLeft
        size={20}
        color={colors.primary[600]}
        strokeWidth={1.75}
        style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null}
      />
      <Text style={[T.bodyStrong, { color: colors.primary[600], marginStart: 4 }]}>{label}</Text>
    </Pressable>
  );
}

export function BuyerTabs() {
  const { t } = useLanguage();
  const { profile, sessionEmail } = useBuyerAuth();
  const [tab, setTab] = useState<TabKey>('home');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [payBookingId, setPayBookingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<'new' | 'legacy' | 'notifs' | null>(null);
  const [createTab, setCreateTab] = useState<'catalogue' | 'notifs'>('catalogue');
  const [unread, setUnread] = useState(false);

  const refreshUnread = useCallback(async () => {
    try {
      const notifs = ((await getAdminNotifications()) ?? []) as { read_at?: string | null }[];
      setUnread(notifs.some((n) => !n.read_at));
    } catch {
      setUnread(false);
    }
  }, []);

  useEffect(() => {
    if (!creating && !selectedBookingId && !payBookingId) void refreshUnread();
  }, [tab, creating, selectedBookingId, payBookingId, refreshUnread]);

  const userName = profile && 'full_name' in profile && typeof profile.full_name === 'string'
    ? profile.full_name.split(' ')[0]
    : (sessionEmail ?? '').split('@')[0] || null;

  const goNew = () => {
    setSelectedBookingId(null);
    setPayBookingId(null);
    setCreating('new');
  };

  const goNotifs = () => {
    setSelectedBookingId(null);
    setPayBookingId(null);
    setCreating('notifs');
  };

  const finishNew = (bookingId: string) => {
    setCreating(null);
    setTab('requests');
    setSelectedBookingId(bookingId);
  };

  const goPay = (bookingId: string) => {
    setPayBookingId(bookingId);
  };

  if (payBookingId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
        <Header title={t('payment.title')} showLogo={false} />
        <PaymentScreen
          bookingId={payBookingId}
          onDone={() => {
            setPayBookingId(null);
            setTab('requests');
            setSelectedBookingId(payBookingId);
          }}
          onBack={() => {
            setPayBookingId(null);
            setTab('requests');
            setSelectedBookingId(payBookingId);
          }}
        />
      </View>
    );
  }

  if (creating === 'new') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
        <Header title={t('create.newTitle')} showLogo={false} />
        <View style={{ flex: 1, paddingHorizontal: spacing.screen, paddingTop: 12 }}>
          <CreateInspectionScreen onDone={finishNew} onCancel={() => setCreating(null)} />
        </View>
      </View>
    );
  }

  if (creating === 'notifs') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
        <Header title={t('notifications.title')} showLogo={false} />
        <BackRow
          onBack={() => {
            setCreating(null);
            void refreshUnread();
          }}
          label={t('create.backHome')}
        />
        <NotificationsScreen
          onBack={() => {
            setCreating(null);
            void refreshUnread();
          }}
        />
      </View>
    );
  }

  if (creating === 'legacy') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
        <Header title={createTab === 'notifs' ? t('notifications.title') : t('create.newTitle')} showLogo={false} />
        <BackRow onBack={() => setCreating(null)} label={t('create.backHome')} />
        <BuyerScreen initialTab={createTab} />
      </View>
    );
  }

  if (selectedBookingId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
        <Header title={t('requests.title')} showLogo={false} />
        <RequestDetailScreen
          bookingId={selectedBookingId}
          onBack={() => setSelectedBookingId(null)}
          onManage={() => setCreating('legacy')}
          onPay={goPay}
          onSeeReport={() => {
            setSelectedBookingId(null);
            setTab('reports');
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
      {tab === 'home' ? (
        <Header variant="brand" hasUnread={unread} onBell={goNotifs} />
      ) : (
        <Header
          title={
            tab === 'requests'
              ? t('requests.title')
              : tab === 'reports'
                ? t('reports.title')
                : t('profile.title')
          }
          showLogo={false}
          hasUnread={unread}
          onBell={goNotifs}
        />
      )}
      <View style={{ flex: 1 }}>
        {tab === 'home' ? (
          <HomeScreen
            userName={userName}
            onNewInspection={goNew}
            onSelectBooking={(id) => setSelectedBookingId(id)}
            onSeeAllRequests={() => setTab('requests')}
          />
        ) : tab === 'requests' ? (
          <RequestsScreen
            onSelect={(id) => setSelectedBookingId(id)}
            onNew={goNew}
            onPay={goPay}
            onSeeReport={() => setTab('reports')}
          />
        ) : tab === 'reports' ? (
          <ReportsScreen onGoRequests={() => setTab('requests')} />
        ) : (
          <ProfileScreen />
        )}
      </View>
      <TabBar active={tab} onChange={(next) => setTab(next)} />
    </View>
  );
}
