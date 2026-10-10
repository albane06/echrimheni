/**
 * P7.2/P7.4/P7.10 — Mes demandes : onglets En cours / Terminées,
 * données réelles, StatusBadge systématique, Skeleton, erreur + réessai.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { getActiveServices, getMyBookings } from '@echrimheni/database';
import { colors, radius, spacing } from '../theme/tokens';
import { maxFontSizeMultiplier } from '../theme/tokens';
import { formatDate, formatPrice } from '../theme/format';
import { nextActionHint } from '../utils/tracking';
import { paymentCtaForStatus } from '../utils/payment';
import { splitBookings } from '../utils/bookings';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, StatusBadge } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { useLanguage } from '../i18n';

type BookingRow = {
  id: string;
  status: string;
  price_total: number;
  created_at: string;
  service_id?: string | null;
  listings?: { title?: string | null; make?: string | null; model?: string | null; year?: number | null; location_wilaya?: string | null } | null;
  reports?: { score?: number | null; is_published?: boolean | null } | { score?: number | null; is_published?: boolean | null }[] | null;
};

export function RequestsScreen({
  onSelect,
  onNew,
  onPay,
  onSeeReport,
}: {
  onSelect: (bookingId: string) => void;
  onNew: () => void;
  onPay?: (bookingId: string) => void;
  onSeeReport?: () => void;
}) {
  const { t, T, lang } = useLanguage();
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [rows, svcs] = await Promise.all([getMyBookings(), getActiveServices()]);
        setBookings((rows ?? []) as BookingRow[]);
        const map: Record<string, string> = {};
        for (const s of (svcs ?? []) as { id: string; name?: string }[]) {
          if (s.id && s.name) map[s.id] = s.name;
        }
        setServiceNames(map);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('errors.loadFail'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(false);
  }, [load, lang]);

  const { active, done } = useMemo(() => splitBookings(bookings), [bookings]);
  const filtered = tab === 'done' ? done : active;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.app }}
      contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.h1, { color: colors.text.primary, marginBottom: spacing.md }]}>
        {t('requests.title')}
      </Text>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          backgroundColor: colors.bg.subtle,
          borderRadius: radius.card,
          padding: 4,
          marginBottom: spacing.lg,
        }}
      >
        {(
          [
            { key: 'active', label: t('requests.active') },
            { key: 'done', label: t('requests.done') },
          ] as const
        ).map((tabItem) => (
          <Pressable
            key={tabItem.key}
            onPress={() => setTab(tabItem.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === tabItem.key }}
            accessibilityLabel={tabItem.label}
            style={{
              flex: 1,
              backgroundColor: tab === tabItem.key ? colors.bg.card : 'transparent',
              borderRadius: radius.input,
              paddingVertical: 10,
              alignItems: 'center',
              minHeight: 48,
              justifyContent: 'center',
            }}
          >
            <Text style={[T.bodyStrong, { color: tab === tabItem.key ? colors.primary[600] : colors.text.secondary }]}>
              {tabItem.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View accessibilityRole="text" accessibilityLabel={t('common.loading')}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton width="70%" height={18} />
              <View style={{ height: 8 }} />
              <Skeleton width="45%" height={14} />
            </Card>
          ))}
        </View>
      ) : error ? (
        <Card>
          <Text style={[T.body, { color: colors.danger.main }]}>{t('requests.loadFail')}</Text>
          <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>{error}</Text>
          <View style={{ marginTop: spacing.md }}>
            <Button title={t('common.retry')} variant="outline" onPress={() => void load(false)} />
          </View>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} color={colors.primary[600]} strokeWidth={1.75} />}
          title={tab === 'active' ? t('requests.emptyActiveTitle') : t('requests.emptyDoneTitle')}
          message={tab === 'active' ? t('requests.emptyActiveMsg') : t('requests.emptyDoneMsg')}
          actionTitle={tab === 'active' ? t('requests.newInspection') : undefined}
          onAction={tab === 'active' ? onNew : undefined}
        />
      ) : (
        filtered.map((b) => (
          <View key={b.id} style={{ marginBottom: spacing.md }}>
            <Card onPress={() => onSelect(b.id)} accessibilityLabel={`${b.listings?.title ?? b.id}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Text style={[T.h3, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
                  {b.listings?.title ?? ''}
                </Text>
                <StatusBadge status={b.status} />
              </View>
              <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>
                {[b.listings?.location_wilaya, formatDate(b.created_at, lang, 'short')].filter((x) => x && x !== '—').join(' · ')}
              </Text>
              {(b.service_id && serviceNames[b.service_id]) || nextActionHint(b.status, lang) ? (
                <Text style={[T.caption, { color: colors.primary[700], marginTop: 4 }]}>
                  {[(b.service_id && serviceNames[b.service_id]) || null, nextActionHint(b.status, lang)].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 4 }]}>{formatPrice(b.price_total, lang)}</Text>
              {(() => {
                const cta = paymentCtaForStatus(b.status);
                if (cta === 'pay') {
                  return (
                    <View style={{ marginTop: spacing.sm }}>
                      <Button title={t('requests.pay')} compact onPress={() => onPay?.(b.id)} />
                    </View>
                  );
                }
                if (cta === 'track') {
                  return (
                    <View style={{ marginTop: spacing.sm }}>
                      <Button title={t('requests.track')} variant="outline" compact onPress={() => onSelect(b.id)} />
                    </View>
                  );
                }
                if (cta === 'report') {
                  return (
                    <View style={{ marginTop: spacing.sm }}>
                      <Button title={t('requests.seeReport')} variant="secondary" compact onPress={() => onSeeReport?.()} />
                    </View>
                  );
                }
                return null;
              })()}
            </Card>
          </View>
        ))
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button title={t('requests.newInspection')} variant="outline" onPress={onNew} />
      </View>
    </ScrollView>
  );
}
