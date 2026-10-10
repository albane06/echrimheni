/**
 * P7.1 — Bouton EchriMheni (spec §5.1). Un seul `primary` orange par écran.
 * Hauteur 52 (compact 40), rayon 14, cible tactile ≥ 48, haptique léger.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, touch, type } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const backgrounds: Record<ButtonVariant, { bg: string; pressed: string; fg: string }> = {
  primary: { bg: colors.accent[600], pressed: colors.accent[700], fg: colors.text.onDark },
  secondary: { bg: colors.primary[600], pressed: colors.primary[700], fg: colors.text.onDark },
  outline: { bg: colors.bg.card, pressed: colors.primary[50], fg: colors.primary[600] },
  ghost: { bg: 'transparent', pressed: colors.primary[50], fg: colors.primary[600] },
  danger: { bg: colors.danger.bg, pressed: '#FECACA', fg: colors.danger.text },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  compact = false,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const theme = backgrounds[variant];
  const inactive = disabled || loading;
  const height = Math.max(compact ? touch.buttonCompactHeight : touch.buttonHeight, touch.min);
  const role: AccessibilityRole = 'button';
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      disabled={inactive}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        {
          minHeight: height,
          borderRadius: radius.button,
          backgroundColor: inactive
            ? variant === 'outline' || variant === 'ghost'
              ? theme.bg
              : colors.bg.subtle
            : pressed
              ? theme.pressed
              : theme.bg,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? colors.primary[600] : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          opacity: inactive ? 0.75 : 1,
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? '#FFFFFF' : theme.fg} />
      ) : (
        <Text
          style={[
            type.button,
            { color: inactive ? colors.text.muted : theme.fg, textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
