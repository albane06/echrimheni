/**
 * P7.12 / P0-2 — Sélecteur modal accessible et mobile-first (wilayas, communes, options).
 * Conforme WCAG AA (touch >= 48px), RTL natif, recherche en temps réel.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { colors, radius, spacing, touch, type } from '../../theme/tokens';

export interface SelectOption {
  label: string;
  value: string;
  secondaryLabel?: string;
}

export function SelectModal({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Sélectionner…',
  error,
  helper,
  searchPlaceholder = 'Rechercher…',
  style,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onSelect: (val: string) => void;
  placeholder?: string;
  error?: string | null;
  helper?: string | null;
  searchPlaceholder?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value || o.label === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.secondaryLabel && o.secondaryLabel.toLowerCase().includes(q)) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const hasError = Boolean(error);
  const isRtl = I18nManager.isRTL;

  return (
    <View style={[{ marginBottom: 4 }, style]} accessibilityRole="none">
      <Text
        style={[
          type.caption,
          { color: colors.text.secondary, marginBottom: 4, textAlign: isRtl ? 'right' : 'left' },
        ]}
      >
        {label}
      </Text>

      <Pressable
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? colors.primary[50] : colors.bg.card,
            borderWidth: hasError ? 2 : 1,
            borderColor: hasError ? colors.danger.main : colors.border.default,
            borderRadius: radius.input,
            minHeight: Math.max(touch.buttonHeight, touch.min),
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
      >
        <Text
          style={[
            type.body,
            {
              color: selectedOption ? colors.text.primary : colors.text.muted,
              flex: 1,
              textAlign: isRtl ? 'right' : 'left',
            },
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={colors.text.secondary} strokeWidth={1.75} />
      </Pressable>

      {hasError ? (
        <Text
          style={[
            type.caption,
            { color: colors.danger.main, marginTop: 4, textAlign: isRtl ? 'right' : 'left' },
          ]}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text
          style={[
            type.caption,
            { color: colors.text.secondary, marginTop: 4, textAlign: isRtl ? 'right' : 'left' },
          ]}
        >
          {helper}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 27, 45, 0.45)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.bg.card,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              padding: spacing.lg,
              maxHeight: '85%',
              minHeight: '60%',
            }}
          >
            {/* Header modal */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.md,
              }}
            >
              <Text style={[type.h3, { color: colors.text.primary, textAlign: isRtl ? 'right' : 'left' }]}>
                {label}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                style={{
                  width: touch.min,
                  height: touch.min,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} color={colors.text.primary} />
              </Pressable>
            </View>

            {/* Champ de recherche */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.bg.app,
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: colors.border.default,
                paddingHorizontal: 10,
                minHeight: 44,
                marginBottom: spacing.md,
                gap: 8,
              }}
            >
              <Search size={18} color={colors.text.secondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.text.muted}
                style={[
                  type.body,
                  {
                    flex: 1,
                    color: colors.text.primary,
                    textAlign: isRtl ? 'right' : 'left',
                    minHeight: 40,
                  },
                ]}
                autoFocus
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Effacer"
                  style={{ padding: 4 }}
                >
                  <X size={16} color={colors.text.secondary} />
                </Pressable>
              ) : null}
            </View>

            {/* Liste des options */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.xl }}
              renderItem={({ item }) => {
                const active = item.value === value || item.label === value;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.value);
                      setOpen(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      {
                        minHeight: 48,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: active
                          ? colors.primary[50]
                          : pressed
                            ? colors.bg.subtle
                            : 'transparent',
                        marginBottom: 4,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          type.bodyStrong,
                          {
                            color: active ? colors.primary[700] : colors.text.primary,
                            textAlign: isRtl ? 'right' : 'left',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.secondaryLabel ? (
                        <Text
                          style={[
                            type.caption,
                            {
                              color: colors.text.secondary,
                              marginTop: 2,
                              textAlign: isRtl ? 'right' : 'left',
                            },
                          ]}
                        >
                          {item.secondaryLabel}
                        </Text>
                      ) : null}
                    </View>
                    {active ? (
                      <Check size={18} color={colors.primary[600]} strokeWidth={2.5} />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <Text style={[type.body, { color: colors.text.secondary, textAlign: 'center' }]}>
                    Aucun résultat trouvé
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
