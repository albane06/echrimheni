/**
 * P7.12 / P0-3 — Modal dédiée de soumission d'avis pour une inspection terminée.
 * Conforme WCAG AA, étoiles tactiles >= 48px, haptique, RPC Supabase submitReview direct.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Star, X } from 'lucide-react-native';
import { submitReview } from '@echrimheni/database';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { colors, radius, spacing, touch, type } from '../theme/tokens';
import { useLanguage } from '../i18n';

export function ReviewModal({
  visible,
  bookingId,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  bookingId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { t, T } = useLanguage();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await submitReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      onSubmitted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const isRtl = I18nManager.isRTL;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 27, 45, 0.45)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.bg.card,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            padding: spacing.screen,
            paddingBottom: spacing.xxl,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Text style={[T.h2, { color: colors.text.primary, textAlign: isRtl ? 'right' : 'left' }]}>
              {t('detail.reviewCtaTitle')}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={{
                width: touch.min,
                height: touch.min,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Étoiles 1 à 5 */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginVertical: spacing.lg,
            }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Note de 1 à 5 étoiles"
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <Pressable
                  key={star}
                  onPress={() => {
                    void Haptics.selectionAsync().catch(() => undefined);
                    setRating(star);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${star} étoile${star > 1 ? 's' : ''}`}
                  accessibilityState={{ checked: star === rating }}
                  style={{
                    minWidth: touch.min,
                    minHeight: touch.min,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Star
                    size={36}
                    color={active ? colors.warning.main : colors.border.strong}
                    fill={active ? colors.warning.main : 'transparent'}
                    strokeWidth={1.5}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Commentaire optionnel */}
          <Input
            label="Votre commentaire (optionnel)"
            value={comment}
            onChangeText={setComment}
            placeholder="Qualité du rapport, ponctualité, professionnalisme…"
            multiline
            style={{ marginBottom: spacing.md }}
          />

          {error ? (
            <Text style={[T.caption, { color: colors.danger.main, marginBottom: spacing.md }]}>
              {error}
            </Text>
          ) : null}

          {/* Boutons d'action */}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              title={submitting ? t('common.saving') : t('buyer.sendReview')}
              onPress={() => void handleSubmit()}
              loading={submitting}
            />
            <Button
              title={t('common.cancel')}
              variant="ghost"
              onPress={onClose}
              disabled={submitting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
