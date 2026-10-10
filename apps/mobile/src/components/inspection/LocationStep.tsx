/**
 * P7.5/P7.10/P7.12 — Étape 3 : localisation du bien (sélecteur officiel des 58 wilayas).
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Input } from '../ui/Input';
import { SelectModal, type SelectOption } from '../ui/SelectModal';
import { ALGERIA_WILAYAS } from '../../theme/algeriaWilayas';
import { colors, spacing } from '../../theme/tokens';
import type { LocationForm } from './validation';
import { useLanguage } from '../../i18n';

export function LocationStep({
  form,
  onChange,
  formError,
}: {
  form: LocationForm;
  onChange: (patch: Partial<LocationForm>) => void;
  formError: string | null;
}) {
  const { t, T, lang } = useLanguage();

  const wilayaOptions: SelectOption[] = useMemo(() => {
    return ALGERIA_WILAYAS.map((w) => ({
      label: `${w.code}. ${lang === 'ar' ? w.nameAr : w.name}`,
      value: w.name,
      secondaryLabel: lang === 'ar' ? w.name : w.nameAr,
    }));
  }, [lang]);

  return (
    <View>
      <Text style={[T.h3, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('create.locTitle')}
      </Text>

      <SelectModal
        label={t('create.wilaya')}
        value={form.wilaya}
        options={wilayaOptions}
        placeholder={t('create.wilayaPh')}
        searchPlaceholder={t('common.search')}
        onSelect={(selectedWilaya) => {
          const matched = ALGERIA_WILAYAS.find((w) => w.name === selectedWilaya);
          onChange({
            wilaya: selectedWilaya,
            commune: matched && !form.commune ? matched.chiefTown : form.commune,
          });
        }}
      />

      <View style={{ height: spacing.sm }} />

      <Input
        label={t('create.commune')}
        value={form.commune}
        onChangeText={(v) => onChange({ commune: v })}
        placeholder={t('create.communePh')}
      />

      <View style={{ height: spacing.sm }} />

      <Input
        label={t('create.address')}
        value={form.address}
        onChangeText={(v) => onChange({ address: v })}
        placeholder={t('create.addressPh')}
        helper={t('create.addressHelper')}
      />

      {formError ? (
        <Text style={[T.caption, { color: colors.danger.main, marginTop: spacing.md }]}>{t(formError)}</Text>
      ) : null}
    </View>
  );
}
