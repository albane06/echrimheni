/**
 * P7.5/P7.10 — Étape 4 : service réel (filtré par catégorie) + expert approuvé
 * réel (optionnel) + date souhaitée. Prix affichés = `base_price` serveur.
 */
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CalendarDays, Check, Clock } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { colors, radius, shadow, spacing, type } from '../../theme/tokens';
import { formatDate, formatPrice } from '../../theme/format';
import { useLanguage } from '../../i18n';

export type ServiceRow = { id: string; name: string; description?: string | null; base_price: number };
export type ExpertRow = {
  id: string;
  full_name: string;
  wilaya?: string | null;
  specialties?: string[] | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

export function ServiceExpertStep({
  services,
  servicesLoading,
  servicesError,
  serviceId,
  onService,
  experts,
  expertsLoading,
  expertsError,
  expertId,
  onExpert,
  datePart,
  timePart,
  onDate,
  onTime,
  formError,
}: {
  services: ServiceRow[];
  servicesLoading: boolean;
  servicesError: string | null;
  serviceId: string | null;
  onService: (id: string) => void;
  experts: ExpertRow[];
  expertsLoading: boolean;
  expertsError: string | null;
  expertId: string | null;
  onExpert: (id: string | null) => void;
  datePart: string;
  timePart: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  formError: string | null;
}) {
  const { t, T, lang } = useLanguage();
  return (
    <View>
      <Text style={[T.h3, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('create.serviceTitle')}</Text>
      {servicesLoading ? (
        <Text style={[T.body, { color: colors.text.secondary }]}>{t('create.servicesLoading')}</Text>
      ) : servicesError ? (
        <Text style={[T.body, { color: colors.danger.main }]}>{t('create.servicesFail')}</Text>
      ) : services.length === 0 ? (
        <Text style={[T.body, { color: colors.text.secondary }]}>{t('create.noService')}</Text>
      ) : (
        services.map((s) => {
          const active = s.id === serviceId;
          return (
            <Pressable
              key={s.id}
              onPress={() => onService(s.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${s.name}, ${formatPrice(s.base_price, lang)}`}
              style={{
                backgroundColor: active ? colors.primary[50] : colors.bg.card,
                borderRadius: radius.card,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary[500] : colors.border.default,
                padding: spacing.lg,
                marginBottom: spacing.md,
                minHeight: 72,
                ...shadow.card,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={[T.bodyStrong, { color: colors.text.primary, flex: 1 }]}>{s.name}</Text>
                <Text style={[T.bodyStrong, { color: colors.primary[700] }]}>{formatPrice(s.base_price, lang)}</Text>
              </View>
              {s.description ? (
                <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]} numberOfLines={3}>
                  {s.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}

      {/* P1 — Transparence tarifaire immédiate du service choisi */}
      {(() => {
        const selectedService = services.find((s) => s.id === serviceId);
        if (selectedService) {
          return (
            <View
              style={{
                backgroundColor: colors.secondary[50],
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: colors.secondary[500],
                padding: spacing.md,
                marginTop: spacing.md,
                marginBottom: spacing.xs,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[T.caption, { color: colors.secondary[700], fontWeight: '700' }]}>
                  {t('create.selectedServicePrice')}
                </Text>
                <Text style={[T.h3, { color: colors.secondary[700] }]}>
                  {formatPrice(selectedService.base_price, lang)}
                </Text>
              </View>
              <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>
                {t('create.priceServerGuaranteed')}
              </Text>
            </View>
          );
        }
        if (!servicesLoading && !servicesError && services.length > 0) {
          return (
            <View
              style={{
                backgroundColor: colors.bg.subtle,
                borderRadius: radius.card,
                padding: spacing.md,
                marginTop: spacing.md,
                marginBottom: spacing.xs,
              }}
            >
              <Text style={[T.caption, { color: colors.text.secondary }]}>
                {t('create.selectServiceFirst')}
              </Text>
            </View>
          );
        }
        return null;
      })()}

      <Text style={[T.h3, { color: colors.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
        {t('create.expertTitle')}
      </Text>
      {expertsLoading ? (
        <Text style={[T.body, { color: colors.text.secondary }]}>{t('create.expertsLoading')}</Text>
      ) : expertsError ? (
        <Text style={[T.body, { color: colors.danger.main }]}>{t('create.expertsFail')}</Text>
      ) : (
        <>
          <Pressable
            onPress={() => onExpert(null)}
            accessibilityRole="radio"
            accessibilityState={{ checked: expertId === null }}
            accessibilityLabel={t('create.expertAuto')}
            style={{
              backgroundColor: expertId === null ? colors.secondary[50] : colors.bg.card,
              borderRadius: radius.card,
              borderWidth: expertId === null ? 2 : 1,
              borderColor: expertId === null ? colors.secondary[500] : colors.border.default,
              padding: spacing.lg,
              marginBottom: spacing.md,
              minHeight: 64,
            }}
          >
            <Text style={[T.bodyStrong, { color: colors.secondary[700] }]}>{t('create.expertAuto')}</Text>
            <Text style={[T.caption, { color: colors.text.secondary, marginTop: 2 }]}>{t('create.expertAutoDesc')}</Text>
          </Pressable>
          {experts.map((e) => {
            const active = e.id === expertId;
            const hasRating = typeof e.rating_avg === 'number' && e.rating_avg > 0;
            const ratingText = hasRating && e.rating_avg != null
              ? ` · ★ ${e.rating_avg.toFixed(1)}${typeof e.rating_count === 'number' && e.rating_count > 0 ? ` (${t('progress.expertReviewsCount', { count: e.rating_count })})` : ''}`
              : ` · ${t('progress.expertNoReviews')}`;

            return (
              <Pressable
                key={e.id}
                onPress={() => onExpert(e.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={e.full_name}
                style={{
                  backgroundColor: active ? colors.primary[50] : colors.bg.card,
                  borderRadius: radius.card,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.primary[500] : colors.border.default,
                  padding: spacing.lg,
                  marginBottom: spacing.md,
                  minHeight: 72,
                }}
              >
                <Text style={[T.bodyStrong, { color: colors.text.primary }]}>{e.full_name} ✓</Text>
                <Text style={[T.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                  {[(e.specialties ?? []).join(', '), e.wilaya].filter(Boolean).join(' · ') || t('create.expertVerified')}
                  {ratingText}
                </Text>
              </Pressable>
            );
          })}
        </>
      )}

      <Text style={[T.h3, { color: colors.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
        {t('create.dateTitle')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <CalendarDays size={20} color={colors.text.secondary} strokeWidth={1.75} />
        <Text style={[T.caption, { color: colors.text.secondary, flex: 1 }]}>
          {t('create.dateHelper')}
        </Text>
      </View>

      {/* Chips de dates futures rapides (prochains 5 jours) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {useMemo(() => {
          const chips: { iso: string; label: string }[] = [];
          const now = new Date();
          for (let i = 1; i <= 5; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            chips.push({ iso, label: formatDate(iso, lang, 'short') });
          }
          return chips;
        }, [lang]).map((chip) => {
          const isSelected = datePart === chip.iso;
          return (
            <Pressable
              key={chip.iso}
              onPress={() => {
                onDate(chip.iso);
                if (!timePart) onTime('09:00');
              }}
              accessibilityRole="button"
              accessibilityLabel={chip.label}
              accessibilityState={{ selected: isSelected }}
              style={{
                minHeight: 40,
                paddingHorizontal: 12,
                borderRadius: radius.pill,
                backgroundColor: isSelected ? colors.primary[50] : colors.bg.card,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? colors.primary[500] : colors.border.default,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isSelected ? <Check size={14} color={colors.primary[600]} strokeWidth={2.5} /> : null}
              <Text
                style={[
                  type.caption,
                  { color: isSelected ? colors.primary[700] : colors.text.primary, fontWeight: '600' },
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Créneaux horaires rapides */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
        <Clock size={16} color={colors.text.secondary} />
        <Text style={[type.caption, { color: colors.text.secondary }]}>{t('create.timeLabel')}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {['09:00', '11:00', '14:00', '16:00'].map((slot) => {
          const isSlot = timePart === slot;
          return (
            <Pressable
              key={slot}
              onPress={() => onTime(slot)}
              accessibilityRole="button"
              accessibilityLabel={slot}
              accessibilityState={{ selected: isSlot }}
              style={{
                minHeight: 36,
                paddingHorizontal: 12,
                borderRadius: radius.pill,
                backgroundColor: isSlot ? colors.secondary[50] : colors.bg.card,
                borderWidth: isSlot ? 2 : 1,
                borderColor: isSlot ? colors.secondary[500] : colors.border.default,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={[
                  type.caption,
                  { color: isSlot ? colors.secondary[700] : colors.text.primary, fontWeight: '600' },
                ]}
              >
                {slot}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Champs de saisie manuelle / personnalisée */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input label={t('create.dateLabel')} value={datePart} onChangeText={onDate} placeholder={t('create.datePh')} maxLength={10} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label={t('create.timeLabel')} value={timePart} onChangeText={onTime} placeholder={t('create.timePh')} maxLength={5} />
        </View>
      </View>

      {formError ? (
        <Text style={[T.caption, { color: colors.danger.main, marginTop: spacing.md }]}>{t(formError)}</Text>
      ) : null}
    </View>
  );
}
