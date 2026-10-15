/**
 * P7.2/P7.4/P7.7/P7.8/P7.10 — Détail d'une demande : lecture seule,
 * MissionTimeline + StatusBadge, avis existant, Skeleton, réessai réel,
 * pull-to-refresh. Expert/photos affichés si résolvables, sinon omis.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';
import { I18nManager } from 'react-native';
import {
  getApprovedExperts,
  getBookingReview,
  getListingPhotoSignedUrl,
  getMyBookings,
  getMyListings,
} from '@echrimheni/database';
import { colors, spacing } from '../theme/tokens';
import { maxFontSizeMultiplier } from '../theme/tokens';
import { formatDate, formatPrice } from '../theme/format';
import { Button } from '../components/ui/Button';
import { Card, StatusBadge } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { ReviewModal } from '../components/ReviewModal';
import { ListingSourceSection } from '../components/ListingSourceSection';
import { MissionTimeline } from '../components/MissionTimeline';
import { paymentCtaForStatus } from '../utils/payment';
import {
  expertDisplayName,
  isTerminalKind,
  scheduledLabel,
  terminalMessage,
  trackingForStatus,
} from '../utils/tracking';
import { useLanguage } from '../i18n';

type BookingRow = {
  id: string;
  status: string;
  price_total: number;
  location_address?: string | null;
  scheduled_at?: string | null;
  created_at: string;
  expert_id?: string | null;
  listing_id?: string | null;
  listings?: {
    title?: string | null;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    location_wilaya?: string | null;
    location_commune?: string | null;
    listing_url?: string | null;
    source_platform?: string | null;
  } | null;
};

export function RequestDetailScreen({
  bookingId,
  onBack,
  onManage,
  onPay,
  onSeeReport,
}: {
  bookingId: string;
  onBack: () => void;
  onManage?: () => void;
  onPay?: (bookingId: string) => void;
  onSeeReport?: () => void;
}) {
  const { t, T, lang } = useLanguage();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [expertName, setExpertName] = useState<string | null>(null);
  const [review, setReview] = useState<{ rating?: number | null; comment?: string | null } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setExpertName(null);
      setReview(null);
      setPhotoUrl(null);
      setPhotoCount(0);
      try {
        const rows = ((await getMyBookings()) ?? []) as BookingRow[];
        const found = rows.find((b) => b.id === bookingId) ?? null;
        setBooking(found);
        if (found?.expert_id) {
          try {
            const experts = (await getApprovedExperts()) as { id: string; full_name?: string }[];
            const match = (experts ?? []).find((e) => e.id === found.expert_id);
            setExpertName(expertDisplayName(match ?? null));
          } catch {
            setExpertName(null);
          }
        }
        if (found && (found.status === 'COMPLETED' || found.status === 'REPORT_READY')) {
          try {
            const existing = (await getBookingReview(found.id)) as {
              rating?: number | null;
              comment?: string | null;
            } | null;
            setReview(existing);
          } catch {
            setReview(null);
          }
        }
        const listingId = (found as { listing_id?: string } | null)?.listing_id;
        if (listingId) {
          try {
            const listings = ((await getMyListings()) ?? []) as { id: string; photos?: string[] }[];
            const listing = listings.find((l) => l.id === listingId);
            const photos = listing?.photos ?? [];
            setPhotoCount(photos.length);
            if (photos.length > 0) {
              const signed = await getListingPhotoSignedUrl(photos[0]);
              if (signed) setPhotoUrl(signed);
            }
          } catch {
            setPhotoCount(0);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('errors.loadFail'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId, t],
  );

  useEffect(() => {
    void load(false);
  }, [load, lang]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const tracking = booking
    ? trackingForStatus(booking.status, { createdAt: booking.created_at, scheduledAt: booking.scheduled_at }, lang)
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.app }}
      contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('detail.back')}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, marginBottom: spacing.sm }}
      >
        <ArrowLeft
          size={20}
          color={colors.primary[600]}
          strokeWidth={1.75}
          style={lang === 'ar' ? { transform: [{ scaleX: -1 }] } : null}
        />
        <Text style={[T.bodyStrong, { color: colors.primary[600], marginStart: 4 }]}>{t('detail.back')}</Text>
      </Pressable>

      {loading ? (
        <View accessibilityRole="text" accessibilityLabel={t('common.loading')}>
          <Skeleton width="40%" height={26} />
          <View style={{ height: spacing.md }} />
          <Card>
            <Skeleton width="60%" height={28} />
          </Card>
          <View style={{ height: spacing.md }} />
          <Card>
            <Skeleton width="80%" height={18} />
            <View style={{ height: 8 }} />
            <Skeleton width="50%" height={14} />
          </Card>
        </View>
      ) : error ? (
        <Card>
          <Text style={[T.body, { color: colors.danger.main }]}>{t('detail.loadFail')}</Text>
          <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>{error}</Text>
          <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title={t('common.retry')} variant="outline" onPress={() => void load(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t('detail.back')} variant="ghost" onPress={onBack} />
            </View>
          </View>
        </Card>
      ) : !booking ? (
        <Card>
          <Text style={[T.body, { color: colors.text.secondary }]}>{t('detail.notFound')}</Text>
          <View style={{ marginTop: spacing.md }}>
            <Button title={t('detail.back')} variant="outline" onPress={onBack} />
          </View>
        </Card>
      ) : (
        <>
          <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.h1, { color: colors.text.primary }]}>
            {t('detail.titlePrefix')}
            {booking.id.slice(0, 8)}
          </Text>
          <View style={{ marginVertical: spacing.md }}>
            <StatusBadge status={booking.status} large />
          </View>
          {(() => {
            const cta = paymentCtaForStatus(booking.status);
            if (cta === 'pay') {
              return (
                <Card highlight>
                  <Text style={[T.h3, { color: colors.text.primary }]}>{t('detail.acceptedTitle')}</Text>
                  <Text style={[T.body, { color: colors.text.secondary, marginTop: 4 }]}>
                    {t('detail.acceptedMsg', { price: formatPrice(booking.price_total, lang) })}
                  </Text>
                  <View style={{ marginTop: spacing.md }}>
                    <Button title={t('detail.payCta')} onPress={() => onPay?.(booking.id)} />
                  </View>
                </Card>
              );
            }
            if (cta === 'track') {
              const label =
                booking.status === 'PAID'
                  ? t('detail.paidMsg')
                  : booking.status === 'SCHEDULED'
                    ? `${t('tracking.scheduled')} — ${scheduledLabel(booking.scheduled_at, lang)}`
                    : t('detail.progressMsg');
              return (
                <Card>
                  <Text style={[T.body, { color: colors.text.primary }]}>{label}</Text>
                  {booking.status === 'PAID' ? (
                    <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 4 }]}>
                      {t('detail.paidAmount', { price: formatPrice(booking.price_total, lang) })}
                    </Text>
                  ) : null}
                </Card>
              );
            }
            if (cta === 'report') {
              return (
                <Card highlight>
                  <Text style={[T.h3, { color: colors.text.primary }]}>{t('detail.reportTitle')}</Text>
                  <View style={{ marginTop: spacing.md }}>
                    <Button title={t('detail.seeReport')} onPress={() => onSeeReport?.()} />
                  </View>
                </Card>
              );
            }
            return null;
          })()}
          {tracking ? (
            <>
              <Text style={[T.body, { color: colors.text.primary, marginTop: spacing.sm }]}>
                {tracking.headline}
                {tracking.subline ? ` — ${tracking.subline}` : ''}
              </Text>
              <View style={{ marginTop: spacing.md }}>
                <Card>
                  <MissionTimeline steps={tracking.steps} />
                </Card>
              </View>
            </>
          ) : booking && isTerminalKind(booking.status) ? (
            <Card>
              <Text style={[T.h3, { color: colors.text.primary }]}>
                {terminalMessage(booking.status, lang).title}
              </Text>
              <Text style={[T.body, { color: colors.text.secondary, marginTop: 4 }]}>
                {terminalMessage(booking.status, lang).message}
              </Text>
            </Card>
          ) : null}
          {expertName ? (
            <View style={{ marginTop: spacing.lg }}>
              <Card>
                <Text style={[T.caption, { color: colors.text.secondary }]}>{t('detail.expertTitle')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.primary[50],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={[T.h3, { color: colors.primary[700] }]}>{expertName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.bodyStrong, { color: colors.text.primary }]}>{expertName} ✓</Text>
                    <Text style={[T.caption, { color: colors.text.secondary }]}>{t('detail.expertVerified')}</Text>
                  </View>
                </View>
                <Text style={[T.caption, { color: colors.text.secondary, marginTop: spacing.sm }]}>
                  {scheduledLabel(booking.scheduled_at, lang)}
                </Text>
              </Card>
            </View>
          ) : !booking.expert_id && !isTerminalKind(booking.status) ? (
            <View style={{ marginTop: spacing.lg }}>
              <Card>
                <Text style={[T.body, { color: colors.text.secondary }]}>{t('detail.noExpert')}</Text>
              </Card>
            </View>
          ) : null}
          {booking.status === 'COMPLETED' ? (
            <View style={{ marginTop: spacing.lg }}>
              <Card>
                {review && typeof review.rating === 'number' ? (
                  <>
                    <Text style={[T.body, { color: colors.text.primary }]}>{t('detail.reviewThanks')}</Text>
                    <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 4 }]}>
                      ★ {review.rating} / 5
                    </Text>
                    {review.comment ? (
                      <Text style={[T.body, { color: colors.text.secondary, marginTop: 4 }]}>{review.comment}</Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[T.body, { color: colors.text.primary }]}>{t('detail.reviewCtaTitle')}</Text>
                    <View style={{ marginTop: spacing.sm }}>
                      <Button title={t('detail.reviewCta')} variant="outline" onPress={() => setShowReviewModal(true)} />
                    </View>
                  </>
                )}
              </Card>
            </View>
          ) : null}
          <View style={{ marginTop: spacing.lg }}>
            <Card>
              <Text style={[T.h3, { color: colors.text.primary }]}>{booking.listings?.title ?? t('detail.objectFallback')}</Text>
              {[
                booking.listings?.make || booking.listings?.model
                  ? [booking.listings?.make, booking.listings?.model, booking.listings?.year].filter(Boolean).join(' · ')
                  : null,
                [booking.listings?.location_wilaya, booking.listings?.location_commune].filter(Boolean).join(', ') || null,
                booking.location_address || null,
                booking.scheduled_at ? t('detail.wantedOn', { date: formatDate(booking.scheduled_at, lang, 'long') }) : null,
                t('detail.createdOn', { date: formatDate(booking.created_at, lang, 'long') }),
                expertName ? `${t('detail.expertTitle')} : ${expertName}` : null,
                photoCount > 0 ? t('misc.photosOnAd', { count: photoCount, plural: photoCount > 1 ? 's' : '' }) : null,
              ]
                .filter(Boolean)
                .map((line, i) => (
                  <Text key={i} style={[T.body, { color: colors.text.secondary, marginTop: 4 }]}>
                    {line}
                  </Text>
                ))}
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  accessibilityRole="image"
                  accessibilityLabel={t('create.photoAlt', { n: 1 })}
                  style={{ width: '100%', height: 180, borderRadius: 12, marginTop: spacing.md }}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={[T.h2, { color: colors.text.primary, marginTop: spacing.md }]}>{formatPrice(booking.price_total, lang)}</Text>
              {onManage ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button title={t('detail.manage')} variant="outline" onPress={onManage} />
                </View>
              ) : null}
            </Card>
            <ListingSourceSection source={booking.listings?.source_platform} url={booking.listings?.listing_url} />
          </View>
          <ReviewModal
            visible={showReviewModal}
            bookingId={booking.id}
            onClose={() => setShowReviewModal(false)}
            onSubmitted={() => void load(true)}
          />
        </>
      )}
    </ScrollView>
  );
}
