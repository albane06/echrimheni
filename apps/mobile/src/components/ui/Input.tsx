/**
 * P7.1 — Champ de saisie (spec §5.2) : fond blanc, rayon 12, hauteur 52,
 * label caption, focus bleu + halo, erreur rouge avec message.
 */
import React, { useState } from 'react';
import {
  I18nManager,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { XCircle } from 'lucide-react-native';
import { colors, radius, touch, type } from '../../theme/tokens';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  helper?: string | null;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
} & Pick<
  TextInputProps,
  | 'placeholder'
  | 'placeholderTextColor'
  | 'keyboardType'
  | 'secureTextEntry'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'multiline'
  | 'editable'
  | 'maxLength'
  | 'testID'
>;

export function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  return (
    <View style={[{ marginBottom: 4 }, style]} accessibilityRole="none">
      <Text style={[type.caption, { color: colors.text.secondary, marginBottom: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.text.muted}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: rest.editable === false }}
        style={[
          {
            backgroundColor: colors.bg.card,
            borderWidth: hasError || focused ? 2 : 1,
            borderColor: hasError ? colors.danger.main : focused ? colors.primary[500] : colors.border.default,
            borderRadius: radius.input,
            minHeight: Math.max(touch.buttonHeight, touch.min),
            paddingHorizontal: 12,
            fontFamily: type.body.fontFamily,
            fontSize: type.body.fontSize,
            color: colors.text.primary,
            textAlign: I18nManager.isRTL ? 'right' : 'left',
          },
          focused && !hasError ? { backgroundColor: colors.primary[50] } : null,
        ]}
        {...rest}
      />
      {hasError ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
          <XCircle size={14} color={colors.danger.main} strokeWidth={1.75} />
          <Text style={[type.caption, { color: colors.danger.main, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={[type.caption, { color: colors.text.secondary, marginTop: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{helper}</Text>
      ) : null}
    </View>
  );
}
