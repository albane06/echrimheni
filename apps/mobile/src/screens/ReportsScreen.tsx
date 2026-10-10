/**
 * P7.2/P7.4/P7.7/P7.10 — Rapports : rapports publiés réels, ScoreGauge,
 * PDF réel quand disponible, part désactivé explicite.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Download, FileText, Share2 } from 'lucide-react-native';
import { getBuyerReport, getMyBookings, getReportPdfSignedUrl } from '@echrimheni/database';
import { colors, spacing } from '../theme/tokens';
import { maxFontSizeMultiplier } from '../theme/tokens';
import { formatDate } from '../theme/format';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, StatusBadge } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { ScoreGauge } from '../components/ui/Progress';
import { useLanguage } from '../i18n';

type BookingRow = {
  id: string;
  status: string;
  listings?: { title?: string | null } | null;
};

type ReportRow = {
  id: string;
  booking_id: string;
  score: number | null;
  summary?: string | null;
  pdf_url?: string | null;
  is_published?: boolean | null;
  created_at?: string | null;
};

const REPORTABLE = ['REPORT_READY', 'COMPLETED'];

export function ReportsScreen() {
  const { t, T, lang } = useLanguage();
  const [items, setItems] = useState<{ booking: BookingRow; report: ReportRow | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bookings = ((await getMyBookings()) ?? []) as BookingRow[];
      const candidates = bookings.filter((b) => REPORTABLE.includes(b.status));
      const rows = await Promise.all(
        candidates.map(async (booking) => {
          try {
            const report = (await getBuyerReport(booking.id)) as ReportRow | null;
            return { booking, report };
          } catch {
            return { booking, report: null };
          }
        }),
      );
      setItems(rows.filter((r) => r.report));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.loadFail'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, lang]);

  const openPdf = useCallback(
    async (report: ReportRow) => {
      if (!report.pdf_url) {
        setPdfError(t('reports.pdfMissing'));
        return;
      }
      setPdfBusy(report.id);
      setPdfError(null);
      try {
        const url = await getReportPdfSignedUrl(report.pdf_url);
        if (!url) {
          setPdfError(t('reports.pdfMissing'));
          return;
        }
        await Linking.openURL(url);
      } catch (err: unknown) {
        setPdfError(err instanceof Error ? err.message : t('reports.pdfMissing'));
      } finally {
        setPdfBusy(null);
      }
    },
    [t],
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg.app }} contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}>
      <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[T.h1, { color: colors.text.primary, marginBottom: spacing.md }]}>
        {t('reports.title')}
      </Text>
      {loading ? (
        <View accessibilityRole="text" accessibilityLabel={t('common.loading')}>
          {[0, 1].map((i) => (
            <View key={i} style={{ marginBottom: spacing.lg }}>
              <Card>
                <Skeleton width="55%" height={20} />
                <View style={{ height: spacing.md }} />
                <Skeleton width="40%" height={120} />
              </Card>
            </View>
          ))}
        </View>
      ) : error ? (
        <Card>
          <Text style={[T.body, { color: colors.danger.main }]}>{t('reports.loadFail')}</Text>
          <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>{error}</Text>
          <View style={{ marginTop: spacing.md }}>
            <Button title={t('common.retry')} variant="outline" onPress={() => void load()} />
          </View>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} color={colors.primary[600]} strokeWidth={1.75} />}
          title={t('reports.emptyTitle')}
          message={t('reports.emptyMsg')}
        />
      ) : (
        items.map(({ booking, report }) => (
          <View key={booking.id} style={{ marginBottom: spacing.lg }}>
            <Card highlight>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[T.h3, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
                  {booking.listings?.title ?? t('reports.verifiedReport')}
                </Text>
                <StatusBadge status="REPORT_READY" />
              </View>
              {typeof report?.score === 'number' ? <ScoreGauge score={report.score} /> : null}
              <Text style={[T.caption, { color: colors.text.secondary, marginTop: spacing.sm }]}>
                {[report?.created_at ? formatDate(report.created_at, lang, 'short') : null, t('reports.verifiedReport')].filter(Boolean).join(' · ')}
              </Text>
              {report?.summary ? (
                <Text style={[T.body, { color: colors.text.secondary, marginTop: spacing.sm }]}>{report.summary}</Text>
              ) : null}
              {pdfError ? (
                <Text style={[T.caption, { color: colors.danger.main, marginTop: spacing.sm }]}>{pdfError}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={pdfBusy === report?.id ? t('reports.openingPdf') : t('reports.downloadPdf')}
                    onPress={() => report && void openPdf(report)}
                    loading={pdfBusy === report?.id}
                    compact
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('reports.shareDisabled')}
                  accessibilityState={{ disabled: true }}
                  disabled
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: colors.border.strong,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5,
                  }}
                >
                  <Share2 size={20} color={colors.text.muted} strokeWidth={1.75} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 }}>
                <Download size={14} color={colors.text.muted} strokeWidth={1.75} />
                <Text style={[T.caption, { color: colors.text.muted }]}>
                  {report?.pdf_url ? t('reports.pdfServerNote') : t('reports.pdfMissing')}
                </Text>
              </View>
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}
