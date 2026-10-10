/**
 * P7.1 — Carte, badge de statut, bannière de confiance, état vide (spec §5.3/5.4/5.5).
 */
import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors, radius, shadow, spacing, type } from '../../theme/tokens';
import { getStatusPresentation } from '../../theme/statusConfig';
import { maxFontSizeMultiplier } from '../../theme/tokens';
import { useLanguage } from '../../i18n';

export function Card({
  children,
  onPress,
  highlight = false,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  highlight?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <View
      style={[
        {
          backgroundColor: colors.bg.card,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border.default,
          padding: spacing.cardPadding,
          ...(highlight
            ? { borderLeftWidth: 4, borderLeftColor: colors.secondary[500] }
            : null),
          ...shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return <View accessibilityLabel={accessibilityLabel}>{body}</View>;
  const pressedStyle = (pressed: boolean) => [
    { opacity: pressed ? 0.96 : 1 },
    pressed
      ? { backgroundColor: colors.primary[50], borderRadius: radius.card }
      : null,
  ];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressedStyle(pressed)}
    >
      {body}
    </Pressable>
  );
}

export function StatusBadge({
  status,
  large = false,
}: {
  status: string | null | undefined;
  large?: boolean;
}) {
  const p = getStatusPresentation(status);
  const { t } = useLanguage();
  const { Icon } = p;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('tracking.listLabel') + ` : ${t(`status.${p.key}`)}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: p.background,
        borderRadius: radius.pill,
        minHeight: large ? 32 : 28,
        paddingHorizontal: 10,
        gap: 4,
      }}
    >
      <Icon size={16} color={p.foreground} strokeWidth={1.75} />
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[type.badge, { color: p.foreground }]}
      >
        {t(`status.${p.key}`)}
      </Text>
    </View>
  );
}

export function TrustBanner({ message }: { message?: string }) {
  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary[50],
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <ShieldCheck size={20} color={colors.secondary[600]} strokeWidth={1.75} />
      <Text style={[type.caption, { color: colors.secondary[700], flex: 1 }]}>
        {message ?? 'Assignation impartiale : l\u2019expert ne connaît ni l\u2019acheteur ni le vendeur.'}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.primary[50],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}
      >
        {icon}
      </View>
      <Text style={[type.h3, { color: colors.text.primary, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm }]}>
        {message}
      </Text>
      {actionTitle && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionTitle}
          style={{
            marginTop: spacing.lg,
            borderWidth: 1.5,
            borderColor: colors.primary[600],
            borderRadius: radius.button,
            paddingHorizontal: 16,
            minHeight: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[type.button, { color: colors.primary[600], fontSize: 14 }]}>{actionTitle}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
