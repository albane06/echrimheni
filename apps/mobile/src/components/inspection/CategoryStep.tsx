/**
 * P7.5/P7.10 — Étape 1 : catégorie réelle, sélection obligatoire.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Car, Package, Refrigerator, Smartphone, type LucideIcon } from 'lucide-react-native';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { useLanguage } from '../../i18n';

export type Category = { id: string; code: string; name: string; description?: string | null };

const ICONS: Record<string, LucideIcon> = {
  automobile: Car,
  telephone: Smartphone,
  electromenager: Refrigerator,
};

export function CategoryStep({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { T } = useLanguage();
  return (
    <View accessibilityRole="list">
      {categories.map((c) => {
        const Icon = ICONS[c.code] ?? Package;
        const active = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={c.name}
            style={({ pressed }) => [
              {
                backgroundColor: pressed || active ? colors.primary[50] : colors.bg.card,
                borderRadius: radius.card,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary[500] : colors.border.default,
                padding: spacing.lg,
                marginBottom: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 72,
                ...shadow.card,
              },
            ]}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: active ? colors.primary[100] : colors.primary[50],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={24} color={colors.primary[600]} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.bodyStrong, { color: colors.text.primary }]}>{c.name}</Text>
              {c.description ? (
                <Text style={[T.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
                  {c.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
