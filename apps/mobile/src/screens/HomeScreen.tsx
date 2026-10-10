/**
 * P7.2/P7.4/P7.10 — Accueil buyer (spec §6.4). Données réelles uniquement.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Car, ChevronRight, ClipboardList, Package, Refrigerator, Search, Smartphone, type LucideIcon } from 'lucide-react-native';
import { getCategories, getMyBookings, getMyListings } from '@echrimheni/database';
import { colors, radius, shadow, spacing } from '../theme/tokens';
import { brandGradient } from '../theme/tokens';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, StatusBadge, TrustBanner } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { maxFontSizeMultiplier } from '../theme/tokens';
import { formatDate, formatPrice } from '../theme/format';
import { useLanguage } from '../i18n';

type Category = { id: string; code: string; name: string; description?: string | null };
type BookingRow = {
  id: string;
  status: string;
  price_total: number;
  created_at: string;
  listing_id?: string | null;
  listings?: { title?: string | null; location_wilaya?: string | null } | null;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  automobile: Car,
  telephone: Smartphone,
  electromenager: Refrigerator,
};

function categoryIcon(code: string): LucideIcon {
  return CATEGORY_ICONS[code] ?? Package;
}

export function HomeScreen({
  userName,
  onNewInspection,
  onSelectBooking,
  onSeeAllRequests,
}: {
  userName: string | null;
  onNewInspection: () => void;
  onSelectBooking: (bookingId: string) => void;
  onSeeAllRequests: () => void;
}) {
  const { t, T, lang } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<(BookingRow & { categoryName?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, books, listings] = await Promise.all([getCategories(), getMyBookings(), getMyListings()]);
      setCategories(((cats ?? []) as Category[]).filter((c) => (c as { is_active?: boolean }).is_active !== false));
      const catById = new Map(
        (((listings ?? []) as { id: string; category_id?: string }[]).map((l) => [l.id, l.category_id] as const)),
      );
      const catNameById = new Map(((cats ?? []) as Category[]).map((c) => [c.id, c.name] as const));
      const withCat = (((books ?? []) as BookingRow[]).slice(0, 3)).map((b) => ({
        ...b,
        categoryName: (b.listing_id && catNameById.get(catById.get(b.listing_id) ?? '')) || null,
      }));
      setRecent(withCat);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.loadFail'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, lang]);

  const chevronFlip = I18nManager.isRTL ? { transform: [{ scaleX: -1 as const }] } : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg.app }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <LinearGradient
        colors={[brandGradient.from, brandGradient.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: 56 }}
      >
        <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.body, { color: colors.text.onDark, opacity: 0.9 }]}>
          {userName ? t('home.hello', { name: userName }) : t('home.helloGuest')}
        </Text>
        <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.display, { color: colors.text.onDark, marginTop: spacing.sm, textAlign: I18nManager.isRTL ? 'right' : 'left', writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }]}>
          {t('home.heroTitle')}
        </Text>
        <Text style={[T.body, { color: colors.text.onDark, opacity: 0.85, marginTop: spacing.sm }]}>
          {t('home.heroSub')}
        </Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.screen, marginTop: -32 }}>
        <Pressable
          onPress={() => setSearchNote(true)}
          accessibilityRole="button"
          accessibilityLabel={t('home.searchA11y')}
          accessibilityHint={t('home.searchPh')}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Search size={20} color={colors.text.secondary} strokeWidth={1.75} />
              <Text style={[T.body, { color: colors.text.secondary, flex: 1 }]}>
                {t('home.searchPh')}
              </Text>
            </View>
            {searchNote ? (
              <Text style={[T.caption, { color: colors.primary[600], marginTop: 8 }]}>
                {t('home.searchSoon')}
              </Text>
            ) : null}
          </Card>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.screen, marginTop: spacing.lg }}>
        <Button title={t('home.newInspection')} onPress={onNewInspection} />
      </View>

      <View style={{ paddingHorizontal: spacing.screen, marginTop: spacing.xl }}>
        <Text style={[T.h2, { color: colors.text.primary, marginBottom: spacing.md }]}>{t('home.categories')}</Text>
        {loading ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }} accessibilityRole="text" accessibilityLabel={t('common.loading')}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: '47%' }}>
                <Card>
                  <Skeleton width={48} height={48} />
                  <View style={{ height: 8 }} />
                  <Skeleton width="80%" height={16} />
                </Card>
              </View>
            ))}
          </View>
        ) : error ? (
          <Card>
            <Text style={[T.body, { color: colors.danger.main }]}>{t('home.loadFail')}</Text>
            <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>{error}</Text>
            <View style={{ marginTop: spacing.md }}>
              <Button title={t('common.retry')} variant="outline" onPress={() => void load()} />
            </View>
          </Card>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {categories.map((c) => {
              const Icon = categoryIcon(c.code);
              return (
                <Pressable
                  key={c.id}
                  onPress={onNewInspection}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  style={({ pressed }) => [
                    {
                      width: '47%',
                      backgroundColor: pressed ? colors.primary[50] : colors.bg.card,
                      borderRadius: radius.card,
                      borderWidth: 1,
                      borderColor: colors.border.default,
                      padding: spacing.lg,
                      alignItems: 'center',
                      ...shadow.card,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.primary[50],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Icon size={24} color={colors.primary[600]} strokeWidth={1.75} />
                  </View>
                  <Text style={[T.bodyStrong, { color: colors.text.primary, textAlign: 'center' }]}>{c.name}</Text>
                  {c.description ? (
                    <Text numberOfLines={2} style={[T.caption, { color: colors.text.secondary, textAlign: 'center', marginTop: 2 }]}>
                      {c.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: spacing.screen, marginTop: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text style={[T.h2, { color: colors.text.primary }]}>{t('home.inProgress')}</Text>
          <Pressable onPress={onSeeAllRequests} accessibilityRole="button" accessibilityLabel={t('home.seeAllRequests')} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Text style={[T.bodyStrong, { color: colors.primary[600] }]}>{t('common.seeAll')}</Text>
          </Pressable>
        </View>
        {loading ? (
          <View accessibilityRole="text" accessibilityLabel={t('common.loading')}>
            {[0, 1].map((i) => (
              <View key={i} style={{ marginBottom: spacing.md }}>
                <Card>
                  <Skeleton width="60%" height={18} />
                  <View style={{ height: 8 }} />
                  <Skeleton width="40%" height={14} />
                </Card>
              </View>
            ))}
          </View>
        ) : error ? (
          <Card>
            <Text style={[T.body, { color: colors.danger.main }]}>{t('home.demandsFail')}</Text>
            <View style={{ marginTop: spacing.md }}>
              <Button title={t('common.retry')} variant="outline" onPress={() => void load()} />
            </View>
          </Card>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={48} color={colors.primary[600]} strokeWidth={1.75} />}
            title={t('home.noRequestsTitle')}
            message={t('home.noRequestsMsg')}
            actionTitle={t('home.newInspection')}
            onAction={onNewInspection}
          />
        ) : (
          recent.map((b) => (
            <View key={b.id} style={{ marginBottom: spacing.md }}>
              <Card onPress={() => onSelectBooking(b.id)} accessibilityLabel={`${b.listings?.title ?? ''}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[T.h3, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
                    {b.listings?.title ?? ''}
                  </Text>
                  <StatusBadge status={b.status} />
                </View>
                <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>
                  {[b.categoryName, b.listings?.location_wilaya, formatDate(b.created_at, lang, 'short')].filter((x) => x).join(' · ')}
                </Text>
                <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>{formatPrice(b.price_total, lang)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[T.caption, { color: colors.primary[600] }]}>{t('common.viewDetail')}</Text>
                  <ChevronRight size={16} color={colors.primary[600]} strokeWidth={1.75} style={chevronFlip} />
                </View>
              </Card>
            </View>
          ))
        )}
        <View style={{ marginTop: spacing.lg }}>
          <TrustBanner message={t('home.trust')} />
        </View>
      </View>
    </ScrollView>
  );
}
