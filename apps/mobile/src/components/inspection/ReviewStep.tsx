/**
 * P7.5/P7.6/P7.10 — Étape 5 : récapitulatif (données saisies + prix serveur)
 * et confirmation. Un seul CTA orange. État succès avec référence réelle.
 */
import React from 'react';
import { Image, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { Card, StatusBadge } from '../ui/Cards';
import { colors, radius, spacing } from '../../theme/tokens';
import { formatPrice } from '../../theme/format';
import type { LocalPhoto } from './ObjectStep';
import type { ExpertRow, ServiceRow } from './ServiceExpertStep';
import type { Category } from './CategoryStep';
import type { ListingSource, LocationForm, ObjectForm } from './validation';
import { sourceLabelKey } from './validation';
import { useLanguage } from '../../i18n';

export function ReviewStep({
  category,
  object,
  isAutomobile,
  location,
  service,
  expert,
  dateLabel,
  photos,
  source,
  sourceUrl,
  submitError,
  photoWarning,
  isSubmitting,
  onConfirm,
  onEditSource,
}: {
  category: Category | null;
  object: ObjectForm;
  isAutomobile: boolean;
  location: LocationForm;
  service: ServiceRow | null;
  expert: ExpertRow | null;
  dateLabel: string;
  photos: LocalPhoto[];
  source: ListingSource;
  sourceUrl: string;
  submitError: string | null;
  photoWarning: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onEditSource: () => void;
}) {
  const { t, T, lang } = useLanguage();
  const shortUrl = sourceUrl.trim().replace(/^https?:\/\/(www\.)?/, '');
  const rows: [string, string][] = [
    [t('create.objTitle'), `${object.title.trim()}${object.make.trim() ? ` — ${object.make.trim()} ${object.model.trim()}` : ''}${object.year.trim() ? ` (${object.year.trim()})` : ''}`],
    [t('home.categories'), category?.name ?? '—'],
  ];
  return (
    <View>
      <Card>
        {rows.map(([label, value], i) => (
          <View key={i} style={{ marginBottom: spacing.sm }}>
            <Text style={[T.caption, { color: colors.text.secondary }]}>{label}</Text>
            <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>{value}</Text>
          </View>
        ))}
        {isAutomobile && object.mileage.trim() ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.mileage')}</Text>
            <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>{object.mileage.trim()}</Text>
          </View>
        ) : null}
        {object.surfaceM2.trim() ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.surface')}</Text>
            <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>{object.surfaceM2.trim()} m²</Text>
          </View>
        ) : null}
        {object.askingPrice.trim() ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.price')}</Text>
            <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>
              {formatPrice(Number(object.askingPrice.trim()), lang)}
            </Text>
          </View>
        ) : null}
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.locTitle')}</Text>
          <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>
            {[location.address.trim(), location.commune.trim(), location.wilaya.trim()].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.serviceTitle')}</Text>
          <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>
            {service ? `${service.name} — ${formatPrice(service.base_price, lang)}` : '—'}
          </Text>
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.expertTitle')}</Text>
          <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>
            {expert ? `${expert.full_name} ✓` : t('create.expertAuto')}
          </Text>
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[T.caption, { color: colors.text.secondary }]}>{t('create.dateTitle')}</Text>
          <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>{dateLabel}</Text>
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[T.caption, { color: colors.text.secondary }]}>{t('marketplace.originTitle')}</Text>
          <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>
            {source === 'ECHRI' ? t(sourceLabelKey(source)) : `${t(sourceLabelKey(source))} — ${shortUrl.slice(0, 48)}${shortUrl.length > 48 ? '…' : ''}`}
          </Text>
        </View>
        <View>
          <Text style={[T.caption, { color: colors.text.secondary }]}>
            {t('create.photos', { count: photos.length, max: 8 })}
          </Text>
          <Text style={[T.bodyStrong, { color: colors.text.primary, marginTop: 2 }]}>
            {photos.length > 0
              ? t('misc.photosOnAd', { count: photos.length, plural: photos.length > 1 ? 's' : '' })
              : '—'}
          </Text>
        </View>
        {object.description.trim() ? (
          <Text style={[T.body, { color: colors.text.secondary, marginTop: spacing.sm }]}>{object.description.trim()}</Text>
        ) : null}
      </Card>
      {photos.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {photos.map((p, i) => (
            <Image
              key={`${p.uri}-${i}`}
              source={{ uri: p.uri }}
              accessibilityRole="image"
              accessibilityLabel={t('create.photoAlt', { n: i + 1 })}
              style={{ width: 72, height: 72, borderRadius: radius.input }}
            />
          ))}
        </View>
      ) : null}
      {photoWarning ? (
        <Text style={[T.caption, { color: colors.warning.text, marginTop: spacing.sm }]}>{photoWarning}</Text>
      ) : null}
      <Text style={[T.caption, { color: colors.text.secondary, marginTop: spacing.md }]}>
        {t('create.reviewServerNote')}
      </Text>
      <View style={{ marginTop: spacing.sm }}>
        <Button title={t('create.editSource')} variant="ghost" onPress={onEditSource} />
      </View>
      {submitError ? (
        <Text style={[T.caption, { color: colors.danger.main, marginTop: spacing.sm }]}>{submitError}</Text>
      ) : null}
      <View style={{ marginTop: spacing.lg }}>
        <Button title={isSubmitting ? t('create.sending') : t('create.confirm')} onPress={onConfirm} loading={isSubmitting} />
      </View>
    </View>
  );
}

export function SuccessView({
  bookingShortId,
  title,
  price,
  onSee,
  onHome,
}: {
  bookingShortId: string;
  title: string;
  price: number;
  onSee: () => void;
  onHome: () => void;
}) {
  const { t, T, lang } = useLanguage();
  return (
    <View>
      <Card highlight>
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <CheckCircle2 size={48} color={colors.success.main} strokeWidth={1.75} />
          <Text style={[T.h2, { color: colors.text.primary, textAlign: 'center', marginTop: spacing.md }]}>
            {t('create.successTitle')}
          </Text>
          <Text style={[T.body, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t('misc.demandRef', { ref: bookingShortId })} · {title} · {formatPrice(price, lang)}
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <StatusBadge status="BOOKING_REQUESTED" />
          </View>
        </View>
      </Card>
      <View style={{ marginTop: spacing.lg }}>
        <Button title={t('create.seeRequest')} onPress={onSee} />
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Button title={t('create.backHomeBtn')} variant="outline" onPress={onHome} />
      </View>
    </View>
  );
}
