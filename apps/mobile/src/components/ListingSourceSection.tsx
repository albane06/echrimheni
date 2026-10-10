/**
 * P7.6/P7.10 — Section « Annonce d'origine » (buyer + expert) : source + lien,
 * ouverture via Linking après garde HTTPS. Rien si aucun lien.
 */
import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { Card } from './ui/Cards';
import { colors, spacing } from '../theme/tokens';
import { isOpenableHttpsUrl, sourceLabelKey } from './inspection/validation';
import { useLanguage } from '../i18n';

function shortHost(url: string): string {
  try {
    const u = new URL(url.trim());
    return (u.hostname + u.pathname).replace(/\/$/, '').slice(0, 48);
  } catch {
    return url.trim().slice(0, 48);
  }
}

export function ListingSourceSection({
  source,
  url,
}: {
  source: string | null | undefined;
  url: string | null | undefined;
}) {
  const { t, T } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  const open = async () => {
    setError(null);
    if (!isOpenableHttpsUrl(trimmed)) {
      setError(t('marketplace.invalidLink'));
      return;
    }
    try {
      await Linking.openURL(trimmed);
    } catch {
      setError(t('marketplace.invalidLink'));
    }
  };
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Card>
        <Text style={[T.h3, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('marketplace.originTitle')}
        </Text>
        <Text style={[T.body, { color: colors.text.secondary }]}>{t(sourceLabelKey(source))}</Text>
        <Text style={[T.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>
          {shortHost(trimmed)}
        </Text>
        <Pressable
          onPress={() => void open()}
          accessibilityRole="button"
          accessibilityLabel={t('marketplace.viewAdSource', { source: t(sourceLabelKey(source)) })}
          style={{
            marginTop: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 48,
          }}
        >
          <ExternalLink size={18} color={colors.primary[600]} strokeWidth={1.75} />
          <Text style={[T.bodyStrong, { color: colors.primary[600] }]}>{t('marketplace.viewAd')}</Text>
        </Pressable>
        {error ? (
          <Text style={[T.caption, { color: colors.danger.main, marginTop: 4 }]}>{error}</Text>
        ) : null}
      </Card>
    </View>
  );
}
