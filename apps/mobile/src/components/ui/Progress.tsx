/**
 * P7.1 — Stepper, Timeline de suivi, jauge de score (spec §5.5).
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { colors, radius, spacing, type } from '../../theme/tokens';
import { maxFontSizeMultiplier } from '../../theme/tokens';
import { useLanguage } from '../../i18n';

export function Stepper({ step, total }: { step: number; total: number }) {
  const { t } = useLanguage();
  const ratio = total > 0 ? Math.min(1, Math.max(0, step / total)) : 0;
  const label = t('create.stepOf', { step, total });
  return (
    <View accessibilityRole="text" accessibilityLabel={label}>
      <Text style={[type.caption, { color: colors.text.secondary, marginBottom: spacing.sm }]}>
        {label}
      </Text>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.border.default,
          overflow: 'hidden',
        }}
      >
        <View
          style={{ height: 6, borderRadius: 3, backgroundColor: colors.secondary[500], width: `${ratio * 100}%` }}
        />
      </View>
    </View>
  );
}

export type TimelineStepState = 'done' | 'current' | 'todo';

export function Timeline({ steps }: { steps: { label: string; state: TimelineStepState }[] }) {
  return (
    <View accessibilityRole="list">
      {steps.map((s, i) => (
        <View key={`${s.label}-${i}`} style={{ flexDirection: 'row' }} accessibilityRole="text" accessibilityLabel={s.label}>
          <View style={{ alignItems: 'center', width: 28 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor:
                  s.state === 'done'
                    ? colors.secondary[500]
                    : s.state === 'current'
                      ? colors.primary[600]
                      : colors.bg.subtle,
                borderWidth: s.state === 'current' ? 3 : 0,
                borderColor: s.state === 'current' ? colors.primary[100] : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.state === 'done' ? <Check size={14} color="#FFFFFF" strokeWidth={2.5} /> : null}
            </View>
            {i < steps.length - 1 ? (
              <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: colors.border.default }} />
            ) : null}
          </View>
          <Text
            style={[
              type.body,
              {
                color: s.state === 'todo' ? colors.text.muted : colors.text.primary,
                marginStart: spacing.sm,
                paddingBottom: spacing.md,
              },
            ]}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function gaugeColor(score: number): string {
  if (score >= 80) return colors.success.main;
  if (score >= 60) return colors.warning.main;
  return colors.danger.main;
}

function gaugeLabelKey(score: number): 'progress.gaugeReliable' | 'progress.gaugeToVerify' | 'progress.gaugeRisky' {
  if (score >= 80) return 'progress.gaugeReliable';
  if (score >= 60) return 'progress.gaugeToVerify';
  return 'progress.gaugeRisky';
}

/** Arc semi-circulaire 180° (spec §5.5) : fond piste + progression. */
function GaugeArc({ score, size = 200 }: { score: number; size?: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startX = cx - r;
  const endX = cx + r;
  // Angle balayé par le score sur 180°.
  const theta = Math.PI * (1 - clamped / 100);
  const px = cx + r * Math.cos(theta);
  const py = cy - r * Math.sin(theta);
  const large = clamped > 50 ? 1 : 0;
  const color = gaugeColor(score);
  return (
    <Svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <Path
        d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
        stroke={colors.border.default}
        strokeWidth={14}
        strokeLinecap="round"
        fill="none"
      />
      {clamped > 0 ? (
        <Path
          d={`M ${startX} ${cy} A ${r} ${r} 0 ${large} 1 ${px} ${py}`}
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}

export function ScoreGauge({ score }: { score: number }) {
  const { t } = useLanguage();
  const label = t(gaugeLabelKey(score));
  return (
    <View
      style={{ alignItems: 'center', paddingVertical: spacing.lg }}
      accessibilityRole="text"
      accessibilityLabel={t('progress.scoreGaugeA11y', { score, label })}
    >
      <GaugeArc score={score} />
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[type.display, { color: colors.text.primary, marginTop: -56 }]}
      >
        {score}
      </Text>
      <Text
        style={[
          type.bodyStrong,
          { color: score >= 80 ? colors.success.text : score >= 60 ? colors.warning.text : colors.danger.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ExpertCard({
  name,
  specialty,
  wilaya,
  rating,
  ratingCount,
  inspections,
  verified = true,
  onPress,
}: {
  name: string;
  specialty: string;
  wilaya: string;
  rating?: number | null;
  ratingCount?: number | null;
  inspections?: number | null;
  verified?: boolean;
  onPress?: () => void;
}) {
  const { t } = useLanguage();
  const cardStyle = {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.cardPadding,
  } as const;

  const hasRating = typeof rating === 'number' && Number.isFinite(rating) && rating > 0;
  const ratingText = hasRating ? `★ ${rating.toFixed(1)}` : null;

  let countSubtitle: string | null = null;
  if (typeof ratingCount === 'number' && ratingCount > 0) {
    countSubtitle = t('progress.expertReviewsCount', { count: ratingCount });
  } else if (typeof inspections === 'number' && inspections > 0) {
    countSubtitle = t('progress.expertInspectionsCount', { count: inspections });
  }

  const reviewStatusLine = hasRating
    ? [ratingText, countSubtitle].filter(Boolean).join(' · ')
    : t('progress.expertNoReviews');

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primary[50],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[type.h3, { color: colors.primary[700] }]}>{name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: colors.text.primary }]}>
          {name}
          {verified ? ' ✓' : ''}
        </Text>
        <Text style={[type.caption, { color: colors.text.secondary }]}>
          {[specialty, wilaya].filter(Boolean).join(' · ')}
        </Text>
        <Text style={[type.caption, { color: colors.text.secondary }]}>
          {reviewStatusLine}
        </Text>
      </View>
    </View>
  );
  if (!onPress) return <View style={cardStyle}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('progress.expertCardA11y', { name })}
      style={cardStyle}
    >
      {inner}
    </Pressable>
  );
}
