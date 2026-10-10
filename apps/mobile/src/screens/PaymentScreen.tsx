/**
 * P7.7/P7.10 — Écran de paiement sandbox. Utilise EXCLUSIVEMENT
 * `processPayment` existant : montant serveur, idempotence par référence
 * stable, vérification serveur avant succès. Aucune donnée bancaire.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react-native';
import {
  getActiveServices,
  getApprovedExperts,
  getMyBookings,
  processPayment,
} from '@echrimheni/database';
import { colors, spacing } from '../theme/tokens';
import { maxFontSizeMultiplier } from '../theme/tokens';
import { formatDate, formatPrice } from '../theme/format';
import { friendlyPaymentError } from '../utils/payment';
import { Button } from '../components/ui/Button';
import { Card, StatusBadge, TrustBanner } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { useLanguage } from '../i18n';

type BookingRow = {
  id: string;
  status: string;
  price_total: number;
  service_id?: string | null;
  expert_id?: string | null;
  scheduled_at?: string | null;
  listings?: { title?: string | null } | null;
};

type Phase = 'loading' | 'ready' | 'paying' | 'success' | 'blocked' | 'error';

function shortRef(bookingId: string): string {
  return `MOB-${bookingId.slice(0, 8).toUpperCase()}`;
}

export function PaymentScreen({
  bookingId,
  onDone,
  onBack,
}: {
  bookingId: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const { t, T, lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>('loading');
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [serviceName, setServiceName] = useState<string | null>(null);
  const [expertName, setExpertName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const paying = useRef(false);
  const txRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const rows = ((await getMyBookings()) ?? []) as BookingRow[];
      const found = rows.find((b) => b.id === bookingId) ?? null;
      if (!found) {
        setPhase('blocked');
        setError(t('errors.notFound'));
        return;
      }
      setBooking(found);
      if (found.status === 'PAID') {
        setPaidAmount(found.price_total);
        setPhase('success');
        return;
      }
      if (found.status !== 'ACCEPTED' && found.status !== 'PAYMENT_PENDING') {
        setPhase('blocked');
        setError(t('payment.blockedMsg'));
        return;
      }
      try {
        const svcs = ((await getActiveServices()) ?? []) as { id: string; name?: string }[];
        const match = svcs.find((s) => s.id === (found as { service_id?: string }).service_id);
        if (match?.name) setServiceName(match.name);
      } catch {
        setServiceName(null);
      }
      if (found.expert_id) {
        try {
          const experts = ((await getApprovedExperts()) ?? []) as { id: string; full_name?: string }[];
          const ex = experts.find((e) => e.id === found.expert_id);
          if (ex?.full_name) setExpertName(ex.full_name);
        } catch {
          setExpertName(null);
        }
      }
      setPhase('ready');
    } catch {
      setPhase('blocked');
      setError(t('payment.blockedTitle'));
    }
  }, [bookingId, t]);

  useEffect(() => {
    void load();
  }, [load, lang]);

  const confirm = useCallback(async () => {
    if (paying.current) return;
    if (!booking) return;
    paying.current = true;
    setPhase('paying');
    setError(null);
    try {
      if (!txRef.current) txRef.current = `${shortRef(booking.id)}-${Date.now()}`;
      const result = (await processPayment({
        bookingId: booking.id,
        method: 'SANDBOX',
        transactionRef: txRef.current,
      })) as { amount?: number } | null;
      const rows = ((await getMyBookings()) ?? []) as BookingRow[];
      const fresh = rows.find((b) => b.id === booking.id) ?? null;
      if (!fresh || fresh.status !== 'PAID') {
        throw new Error('Paiement non confirmé par le serveur.');
      }
      setBooking(fresh);
      setPaidAmount(typeof result?.amount === 'number' ? result.amount : fresh.price_total);
      setPhase('success');
    } catch (err: unknown) {
      setError(friendlyPaymentError(err).message);
      setPhase('error');
    } finally {
      paying.current = false;
    }
  }, [booking]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.app }}
      contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}
    >
      <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.h1, { color: colors.text.primary, marginBottom: spacing.md }]}>
        {t('payment.title')}
      </Text>

      {phase === 'loading' ? (
        <View accessibilityRole="text" accessibilityLabel={t('payment.loading')}>
          <Card>
            <Skeleton width="70%" height={20} />
            <View style={{ height: 8 }} />
            <Skeleton width="45%" height={28} />
          </Card>
        </View>
      ) : null}

      {(phase === 'ready' || phase === 'paying' || phase === 'error') && booking ? (
        <>
          <Card>
            <Text style={[T.h3, { color: colors.text.primary }]}>{booking.listings?.title ?? t('payment.objectFallback')}</Text>
            {[
              serviceName ? `${serviceName}` : null,
              expertName ? `${expertName}` : null,
              booking.scheduled_at ? formatDate(booking.scheduled_at, lang, 'long') : null,
            ]
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i} style={[T.body, { color: colors.text.secondary, marginTop: 4 }]}>
                  {line}
                </Text>
              ))}
            <View style={{ marginTop: spacing.md }}>
              <StatusBadge status={booking.status} />
            </View>
          </Card>

          <View style={{ marginTop: spacing.lg }}>
            <Card highlight>
              <Text style={[T.caption, { color: colors.text.secondary }]}>{t('payment.totalToPay')}</Text>
              <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.display, { color: colors.text.primary, marginTop: 4 }]}>
                {formatPrice(booking.price_total, lang)}
              </Text>
              <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>
                {t('payment.serverNote')}
              </Text>
            </Card>
          </View>

          {phase === 'error' && error ? (
            <Card>
              <Text style={[T.body, { color: colors.danger.main }]}>{error}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button title={t('payment.retry')} onPress={() => void confirm()} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={t('payment.backToRequest')} variant="outline" onPress={onBack} />
                </View>
              </View>
            </Card>
          ) : (
            <View style={{ marginTop: spacing.lg }}>
              <Button
                title={phase === 'paying' ? t('payment.paying') : t('payment.confirm')}
                onPress={() => void confirm()}
                loading={phase === 'paying'}
              />
            </View>
          )}
          <View style={{ marginTop: spacing.lg }}>
            <TrustBanner message={t('payment.sandboxTrust')} />
          </View>
        </>
      ) : null}

      {phase === 'success' && booking ? (
        <Card highlight>
          <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <CheckCircle2 size={48} color={colors.success.main} strokeWidth={1.75} />
            <Text style={[T.h2, { color: colors.text.primary, textAlign: 'center', marginTop: spacing.md }]}>
              {t('payment.success')}
            </Text>
            <Text style={[T.body, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm }]}>
              {formatPrice(paidAmount ?? booking.price_total, lang)} · {t('payment.refLabel', { ref: shortRef(booking.id) })}
            </Text>
            <Text style={[T.body, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm }]}>
              {t('payment.successNext')}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <StatusBadge status="PAID" />
            </View>
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <Button title={t('payment.seeRequest')} onPress={onDone} />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Button title={t('payment.backToRequests')} variant="outline" onPress={onBack} />
          </View>
        </Card>
      ) : null}

      {phase === 'blocked' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Lock size={18} color={colors.text.secondary} strokeWidth={1.75} />
            <Text style={[T.body, { color: colors.text.primary, flex: 1 }]}>
              {error ?? t('payment.blockedTitle')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
            <ShieldCheck size={16} color={colors.secondary[600]} strokeWidth={1.75} />
            <Text style={[T.caption, { color: colors.text.secondary, flex: 1 }]}>
              {t('payment.blockedMsg')}
            </Text>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button title={t('payment.back')} variant="outline" onPress={onBack} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
