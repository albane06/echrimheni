/**
 * P7.3/P7.10 — Onboarding 3 écrans : navigation par boutons, dots,
 * retour dès l'écran 2, « Passer » secondaire, « Commencer » primary.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FileCheck2, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { brandGradient, colors, spacing } from '../theme/tokens';
import { useLanguage } from '../i18n';

type Slide = {
  titleKey: 'onboarding.slide1Title' | 'onboarding.slide2Title' | 'onboarding.slide3Title';
  textKey: 'onboarding.slide1Text' | 'onboarding.slide2Text' | 'onboarding.slide3Text';
  Icon: LucideIcon;
};

const SLIDES: Slide[] = [
  { titleKey: 'onboarding.slide1Title', textKey: 'onboarding.slide1Text', Icon: ShieldCheck },
  { titleKey: 'onboarding.slide2Title', textKey: 'onboarding.slide2Text', Icon: UserCheck },
  { titleKey: 'onboarding.slide3Title', textKey: 'onboarding.slide3Text', Icon: FileCheck2 },
];

function Dots({ index, total }: { index: number; total: number }) {
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }} accessibilityRole="text" accessibilityLabel={t('onboarding.screenOf', { current: index + 1, total })}>
      {SLIDES.slice(0, total).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === index ? colors.primary[600] : colors.border.strong,
          }}
        />
      ))}
    </View>
  );
}

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t, T } = useLanguage();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const last = index === SLIDES.length - 1;
  const Current = SLIDES[index];

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(12);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [index, fade, slide]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) {
        setIndex((prev) => prev - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [index]);

  const finish = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    onDone();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.app }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.screen, paddingBottom: spacing.xxl }}>
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Logo variant="full" tone="color" height={48} />
        </View>
        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <LinearGradient
              colors={[brandGradient.from, brandGradient.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Current.Icon size={56} color="#FFFFFF" strokeWidth={1.75} />
            </LinearGradient>
          </View>
          <Text style={[T.h1, { color: colors.text.primary, textAlign: 'center', marginTop: spacing.xl }]}>
            {t(Current.titleKey)}
          </Text>
          <Text style={[T.body, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t(Current.textKey)}
          </Text>
        </Animated.View>
        <View style={{ marginTop: spacing.xl }}>
          <Dots index={index} total={SLIDES.length} />
          {last ? (
            <View style={{ marginTop: spacing.lg }}>
              <Button title={t('onboarding.start')} onPress={finish} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              {index > 0 ? (
                <View style={{ flex: 1 }}>
                  <Button title={t('onboarding.back')} variant="outline" onPress={() => setIndex(index - 1)} />
                </View>
              ) : null}
              <View style={{ flex: 2 }}>
                <Button title={t('onboarding.next')} variant="secondary" onPress={() => setIndex(index + 1)} />
              </View>
            </View>
          )}
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm }}
          >
            <Text style={[T.bodyStrong, { color: colors.primary[600] }]}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
