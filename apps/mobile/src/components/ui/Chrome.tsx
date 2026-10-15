/**
 * P7.1 — Header, TabBar, Skeleton, Toast, BottomSheet (spec §5.5).
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';
import { ArrowLeft, Bell, ClipboardList, FileCheck2, Home, User, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, touch, type } from '../../theme/tokens';
import { maxFontSizeMultiplier } from '../../theme/tokens';
import { Logo } from '../Logo';
import { useLanguage } from '../../i18n';

export function Header({
  variant = 'light',
  title,
  showLogo = true,
  hasUnread = false,
  onBell,
  onBack,
  backAccessibilityLabel,
}: {
  variant?: 'light' | 'brand';
  title?: string;
  showLogo?: boolean;
  hasUnread?: boolean;
  onBell?: () => void;
  onBack?: () => void;
  backAccessibilityLabel?: string;
}) {
  const { t, T, isRTL } = useLanguage();
  const dark = variant === 'brand';
  return (
    <View
      style={{
        minHeight: touch.headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.screen,
        backgroundColor: dark ? colors.primary[900] : colors.bg.card,
        borderBottomWidth: dark ? 0 : 1,
        borderBottomColor: colors.border.default,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel ?? t('common.back')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: touch.min,
              height: touch.min,
              alignItems: 'center',
              justifyContent: 'center',
              marginStart: -8,
              marginEnd: 4,
            }}
          >
            <ArrowLeft
              size={22}
              color={dark ? '#FFFFFF' : colors.text.primary}
              strokeWidth={2}
              style={isRTL ? { transform: [{ scaleX: -1 }] } : null}
            />
          </Pressable>
        ) : null}
        {showLogo ? (
          <Logo variant="full" tone={dark ? 'white' : 'color'} height={28} />
        ) : (
          <Text
            numberOfLines={1}
            style={[T.h3, { color: dark ? colors.text.onDark : colors.text.primary, flex: 1 }]}
          >
            {title ?? ''}
          </Text>
        )}
      </View>
      {onBell ? (
        <Pressable
          onPress={onBell}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.title')}
          style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}
        >
          <Bell size={24} color={dark ? '#FFFFFF' : colors.text.secondary} strokeWidth={1.75} />
          {hasUnread ? (
            <View
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.accent[600],
              }}
            />
          ) : null}
        </Pressable>
      ) : (
        <View style={{ width: touch.min }} />
      )}
    </View>
  );
}

export type TabKey = 'home' | 'requests' | 'reports' | 'profile';

export function TabBar({
  active,
  onChange,
  badges,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  badges?: Partial<Record<TabKey, string>>;
}) {
  const { t, T } = useLanguage();
  const tabs: { key: TabKey; label: string; Icon: LucideIcon }[] = [
    { key: 'home', label: t('tabs.home'), Icon: Home },
    { key: 'requests', label: t('tabs.requests'), Icon: ClipboardList },
    { key: 'reports', label: t('tabs.reports'), Icon: FileCheck2 },
    { key: 'profile', label: t('tabs.profile'), Icon: User },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bg.card,
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        minHeight: touch.tabBarHeight,
        paddingBottom: spacing.sm,
      }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const isActive = key === active;
        const color = isActive ? colors.primary[600] : colors.text.secondary;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: touch.min }}
          >
            <Icon size={24} color={color} strokeWidth={1.75} />
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              style={[type.badge, { color, marginTop: 2 }]}
            >
              {label}
              {badges?.[key] ? ` (${badges[key]})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const shimmer = { backgroundColor: colors.bg.subtle, borderRadius: radius.input };

export function Skeleton({ width, height = 16 }: { width: DimensionValue; height?: DimensionValue }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  const staticStyle: ViewStyle = { width, height };
  return (
    <Animated.View
      style={[staticStyle, shimmer, { opacity }]}
      accessibilityRole="none"
    />
  );
}

export type ToastTone = 'info' | 'success' | 'error';

export function Toast({ message, tone = 'info' }: { message: string; tone?: ToastTone }) {
  const bg =
    tone === 'success' ? colors.success.text : tone === 'error' ? colors.danger.text : colors.text.primary;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: bg,
        borderRadius: radius.card,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        marginHorizontal: spacing.screen,
      }}
    >
      <Text style={[type.bodyStrong, { color: '#FFFFFF', textAlign: 'center' }]}>{message}</Text>
    </View>
  );
}

export function BottomSheet({
  visible,
  onClose,
  children,
  accessibilityLabel,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        style={{ flex: 1, backgroundColor: 'rgba(15, 27, 45, 0.45)', justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityLabel={accessibilityLabel}
          style={{
            backgroundColor: colors.bg.card,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            padding: spacing.lg,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border.strong,
              marginBottom: spacing.md,
            }}
          />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
