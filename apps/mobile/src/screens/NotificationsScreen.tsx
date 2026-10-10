/**
 * P7.13 / P1-3 — Écran dédié moderne de notifications.
 * Réutilise exclusivement getAdminNotifications / markNotificationAsRead / markAllNotificationsAsRead.
 * Support complet chargement, réessai, actualisation manuelle, dates localisées et RTL.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  I18nManager,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Bell, CheckCheck, Clock } from 'lucide-react-native';
import {
  getAdminNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@echrimheni/database';
import { Button } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { colors, radius, spacing, touch, type } from '../theme/tokens';
import { formatDate } from '../theme/format';
import { useLanguage } from '../i18n';
import { formatUserErrorMessage } from '../utils/errors';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  read_at?: string | null;
  created_at: string;
}

export function NotificationsScreen({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { t, T, lang } = useLanguage();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const rows = ((await getAdminNotifications()) ?? []) as NotificationItem[];
      setNotifs(rows);
    } catch (err: unknown) {
      setError(formatUserErrorMessage(t, err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadNotifs();
  }, [loadNotifs]);

  const handleMarkRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
    );
    try {
      await markNotificationAsRead(id);
    } catch {
      // Échec silencieux, l'interface locale reste fluide
    }
  };

  const handleMarkAllRead = async () => {
    const unreadCount = notifs.filter((n) => !n.read_at).length;
    if (unreadCount === 0) return;

    setNotifs((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
    try {
      await markAllNotificationsAsRead();
    } catch {
      // Échec silencieux
    }
  };

  const isRtl = I18nManager.isRTL;
  const hasUnread = notifs.some((n) => !n.read_at);

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={{ gap: spacing.md, padding: spacing.screen }}>
          <Skeleton width="100%" height={80} />
          <Skeleton width="100%" height={80} />
          <Skeleton width="100%" height={80} />
        </View>
      );
    }

    if (error && notifs.length === 0) {
      return (
        <View style={{ padding: spacing.screen }}>
          <Card>
            <Text style={[T.bodyStrong, { color: colors.danger.main, textAlign: isRtl ? 'right' : 'left' }]}>
              {error}
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button title={t('common.retry')} variant="outline" onPress={() => void loadNotifs()} />
            </View>
          </Card>
        </View>
      );
    }

    if (notifs.length === 0) {
      return (
        <View style={{ padding: spacing.screen }}>
          <EmptyState
            icon={<Bell size={32} color={colors.primary[500]} />}
            title={t('notifications.empty')}
            message={t('notifications.title')}
            actionTitle={t('notifications.refresh')}
            onAction={() => void loadNotifs()}
          />
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNotifs(true)}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Barre d'action : Tout marquer comme lu */}
        {hasUnread ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginBottom: spacing.md,
            }}
          >
            <Pressable
              onPress={() => void handleMarkAllRead()}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.markAllRead')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: touch.min,
                paddingHorizontal: spacing.sm,
              }}
            >
              <CheckCheck size={16} color={colors.primary[600]} />
              <Text style={[T.caption, { color: colors.primary[700], fontWeight: '700' }]}>
                {t('notifications.markAllRead')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Liste des notifications */}
        <View style={{ gap: spacing.md }}>
          {notifs.map((n) => {
            const isUnread = !n.read_at;
            let timeStr = '';
            try {
              const d = new Date(n.created_at);
              timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            } catch {
              timeStr = '';
            }

            return (
              <Pressable
                key={n.id}
                onPress={() => {
                  if (isUnread) void handleMarkRead(n.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${n.title}, ${isUnread ? t('notifications.new') : ''}`}
                style={({ pressed }) => [
                  {
                    backgroundColor: isUnread ? colors.primary[50] : colors.bg.card,
                    borderRadius: radius.card,
                    borderWidth: 1,
                    borderColor: isUnread ? colors.primary[500] : colors.border.default,
                    padding: spacing.cardPadding,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {isUnread ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.primary[600],
                        }}
                      />
                    ) : null}
                    <Text
                      style={[
                        T.bodyStrong,
                        {
                          color: colors.text.primary,
                          flex: 1,
                          textAlign: isRtl ? 'right' : 'left',
                        },
                      ]}
                    >
                      {n.title}
                    </Text>
                  </View>

                  {isUnread ? (
                    <View
                      style={{
                        backgroundColor: colors.primary[100],
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: radius.pill,
                      }}
                    >
                      <Text style={[type.badge, { color: colors.primary[700] }]}>
                        {t('notifications.new')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    T.body,
                    {
                      color: colors.text.secondary,
                      marginTop: 4,
                      textAlign: isRtl ? 'right' : 'left',
                    },
                  ]}
                >
                  {n.message}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: spacing.sm,
                  }}
                >
                  <Clock size={14} color={colors.text.muted} />
                  <Text style={[type.caption, { color: colors.text.muted }]}>
                    {formatDate(n.created_at, lang, 'short')}{timeStr ? ` · ${timeStr}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
      {renderContent()}
    </View>
  );
}
