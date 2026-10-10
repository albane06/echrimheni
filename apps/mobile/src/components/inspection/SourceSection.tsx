/**
 * P7.6/P7.10 — Section « Annonce en ligne » (étape 2) : sélecteur de source
 * (cartes Lucide) + champ URL, affiché/masqué selon la source.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Globe, Link2, ShieldCheck, Store, type LucideIcon } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { LISTING_SOURCES, type ListingSource } from './validation';
import { useLanguage } from '../../i18n';

const SOURCE_ICONS: Record<ListingSource, LucideIcon> = {
  ECHRI: ShieldCheck,
  FACEBOOK_MARKETPLACE: Globe,
  OUEDKNISS: Store,
  OTHER: Link2,
};

export function SourceSection({
  source,
  url,
  onSource,
  onUrl,
  urlError,
}: {
  source: ListingSource;
  url: string;
  onSource: (s: ListingSource) => void;
  onUrl: (v: string) => void;
  urlError: string | null;
}) {
  const { t, T } = useLanguage();
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[T.h3, { color: colors.text.primary, marginBottom: 4 }]}>{t('create.sourceTitle')}</Text>
      <Text style={[T.caption, { color: colors.text.secondary, marginBottom: spacing.sm }]}>
        {t('create.sourceSub')}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('create.sourceTitle')}>
        {LISTING_SOURCES.map((s) => {
          const Icon = SOURCE_ICONS[s.key];
          const active = s.key === source;
          return (
            <Pressable
              key={s.key}
              onPress={() => onSource(s.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={t(s.labelKey)}
              style={{
                backgroundColor: active ? colors.primary[50] : colors.bg.card,
                borderRadius: radius.card,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary[500] : colors.border.default,
                padding: spacing.md,
                marginBottom: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: 60,
                ...shadow.card,
              }}
            >
              <Icon size={22} color={active ? colors.primary[600] : colors.text.secondary} strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <Text style={[T.bodyStrong, { color: colors.text.primary }]}>{t(s.labelKey)}</Text>
                <Text style={[T.caption, { color: colors.text.secondary }]}>{t(s.hintKey)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {source !== 'ECHRI' ? (
        <View style={{ marginTop: spacing.sm }}>
          <Input
            label={t('create.sourceUrlLabel')}
            value={url}
            onChangeText={onUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={t('create.sourceUrlPh')}
            error={urlError ? t(urlError, { source: t(sourceLabelKeyFor(source)) }) : null}
          />
        </View>
      ) : null}
    </View>
  );
}

function sourceLabelKeyFor(source: ListingSource): string {
  switch (source) {
    case 'FACEBOOK_MARKETPLACE':
      return 'marketplace.sourceFB';
    case 'OUEDKNISS':
      return 'marketplace.sourceOK';
    case 'OTHER':
      return 'marketplace.sourceOTHER';
    default:
      return 'marketplace.sourceECHRI';
  }
}
