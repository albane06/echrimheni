/**
 * P7.8 — Timeline de suivi de mission : 8 étapes nominales avec icônes
 * Lucide + dates réelles éventuelles. Chaque item est annoncé
 * (« Étape X, état »), jamais d'info par la couleur seule.
 */
import React from 'react';
import { Text, View } from 'react-native';
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  Flag,
  ScanLine,
  UserCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, spacing, type } from '../theme/tokens';
import type { TrackStep, TrackStepKey } from '../utils/tracking';
import { useLanguage } from '../i18n';

const ICONS: Record<TrackStepKey, LucideIcon> = {
  requested: ClipboardList,
  accepted: UserCheck,
  paid: CreditCard,
  scheduled: CalendarCheck,
  in_progress: ScanLine,
  inspected: CheckCircle2,
  report: FileCheck2,
  completed: Flag,
};

export function MissionTimeline({ steps }: { steps: TrackStep[] }) {
  const { t } = useLanguage();

  const stateLabel = (st: TrackStep['state']): string => {
    switch (st) {
      case 'done':
        return t('tracking.stepStateDone');
      case 'current':
        return t('tracking.stepStateCurrent');
      case 'todo':
      default:
        return t('tracking.stepStateTodo');
    }
  };

  return (
    <View accessibilityRole="list" accessibilityLabel={t('tracking.listLabel')}>
      {steps.map((s, i) => {
        const Icon = ICONS[s.key];
        const active = s.state !== 'todo';
        return (
          <View key={s.key} style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center', width: 32 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
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
                <Icon size={16} color={active ? '#FFFFFF' : colors.text.muted} strokeWidth={1.75} />
              </View>
              {i < steps.length - 1 ? (
                <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: colors.border.default }} />
              ) : null}
            </View>
            <View style={{ flex: 1, marginStart: spacing.sm, paddingBottom: spacing.md }}>
              <Text
                accessibilityRole="text"
                accessibilityLabel={t('tracking.stepA11y', { label: s.label, state: stateLabel(s.state) })}
                style={[type.bodyStrong, { color: s.state === 'todo' ? colors.text.muted : colors.text.primary }]}
              >
                {s.label}
              </Text>
              {s.date ? (
                <Text style={[type.caption, { color: colors.text.secondary, marginTop: 2 }]}>{s.date}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
      <Text style={[type.caption, { color: colors.text.muted, marginTop: spacing.sm }]}>
        {t('tracking.doneCount', { done: steps.filter((s) => s.state === 'done').length, total: steps.length })}
      </Text>
    </View>
  );
}
