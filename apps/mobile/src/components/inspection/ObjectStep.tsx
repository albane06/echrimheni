/**
 * P7.5/P7.10/P8.05 — Étape 2 : objet à inspecter + photos locales + annonce en ligne.
 * Support contextuel multi-domaines : Véhicules, Foncier (Terrain), Immobilier (Bâti).
 */
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Camera, Trash2 } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { colors, radius, spacing } from '../../theme/tokens';
import { MAX_PHOTOS, type ListingSource, type ObjectForm } from './validation';
import { SourceSection } from './SourceSection';
import { useLanguage } from '../../i18n';

export type LocalPhoto = { uri: string; fileName: string; mimeType: string };

export function ObjectStep({
  form,
  onChange,
  isAutomobile,
  categoryCode,
  photos,
  onAddPhoto,
  onRemovePhoto,
  photoBusy,
  formError,
  source,
  url,
  onSource,
  onUrl,
  urlError,
}: {
  form: ObjectForm;
  onChange: (patch: Partial<ObjectForm>) => void;
  isAutomobile: boolean;
  categoryCode?: string;
  photos: LocalPhoto[];
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  photoBusy: boolean;
  formError: string | null;
  source: ListingSource;
  url: string;
  onSource: (s: ListingSource) => void;
  onUrl: (v: string) => void;
  urlError: string | null;
}) {
  const { t, T } = useLanguage();
  const code = categoryCode?.toLowerCase();
  const isTerrain = code === 'terrain';
  const isImmobilier = code === 'immobilier';

  return (
    <View>
      <Input
        label={t('create.objTitle')}
        value={form.title}
        onChangeText={(v) => onChange({ title: v })}
        placeholder={
          isTerrain
            ? 'Ex. Terrain constructible 500m² vue dégagée'
            : isImmobilier
            ? 'Ex. Appartement F4 standing 120m²'
            : t('create.objTitlePh')
        }
      />
      <View style={{ height: spacing.sm }} />

      {isTerrain ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.propertyType')}
                value={form.propertyType}
                onChangeText={(v) => onChange({ propertyType: v })}
                placeholder={t('create.propertyTypePhTerrain')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.surface')}
                value={form.surfaceM2}
                onChangeText={(v) => onChange({ surfaceM2: v })}
                keyboardType="numeric"
                placeholder={t('create.surfacePh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.propertyPaper')}
                value={form.propertyPaper}
                onChangeText={(v) => onChange({ propertyPaper: v })}
                placeholder={t('create.propertyPaperPh')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.cadastralRef')}
                value={form.cadastralRef}
                onChangeText={(v) => onChange({ cadastralRef: v })}
                placeholder={t('create.cadastralRefPh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.gpsLat')}
                value={form.gpsLat}
                onChangeText={(v) => onChange({ gpsLat: v })}
                keyboardType="numeric"
                placeholder={t('create.gpsLatPh')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.gpsLng')}
                value={form.gpsLng}
                onChangeText={(v) => onChange({ gpsLng: v })}
                keyboardType="numeric"
                placeholder={t('create.gpsLngPh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.price')}
                value={form.askingPrice}
                onChangeText={(v) => onChange({ askingPrice: v })}
                keyboardType="numeric"
                placeholder={t('create.pricePh')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.topography')}
                value={form.topography}
                onChangeText={(v) => onChange({ topography: v })}
                placeholder={t('create.topographyPh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <Input
            label={t('create.roadAccess')}
            value={form.roadAccess}
            onChangeText={(v) => onChange({ roadAccess: v })}
            placeholder={t('create.roadAccessPh')}
          />
        </>
      ) : isImmobilier ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.propertyType')}
                value={form.propertyType}
                onChangeText={(v) => onChange({ propertyType: v })}
                placeholder={t('create.propertyTypePhBati')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.surface')}
                value={form.surfaceM2}
                onChangeText={(v) => onChange({ surfaceM2: v })}
                keyboardType="numeric"
                placeholder={t('create.surfacePh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.rooms')}
                value={form.rooms}
                onChangeText={(v) => onChange({ rooms: v })}
                keyboardType="numeric"
                placeholder={t('create.roomsPh')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.floors')}
                value={form.floors}
                onChangeText={(v) => onChange({ floors: v })}
                keyboardType="numeric"
                placeholder={t('create.floorsPh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.condition')}
                value={form.condition}
                onChangeText={(v) => onChange({ condition: v })}
                placeholder={t('create.conditionPh')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.price')}
                value={form.askingPrice}
                onChangeText={(v) => onChange({ askingPrice: v })}
                keyboardType="numeric"
                placeholder={t('create.pricePh')}
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.gpsLat')}
                value={form.gpsLat}
                onChangeText={(v) => onChange({ gpsLat: v })}
                keyboardType="numeric"
                placeholder={t('create.gpsLatPh')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('create.gpsLng')}
                value={form.gpsLng}
                onChangeText={(v) => onChange({ gpsLng: v })}
                keyboardType="numeric"
                placeholder={t('create.gpsLngPh')}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input label={t('create.make')} value={form.make} onChangeText={(v) => onChange({ make: v })} placeholder={t('create.makePh')} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('create.model')} value={form.model} onChangeText={(v) => onChange({ model: v })} placeholder={t('create.modelPh')} />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input label={t('create.year')} value={form.year} onChangeText={(v) => onChange({ year: v })} keyboardType="numeric" placeholder="2019" maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              {isAutomobile ? (
                <Input label={t('create.mileage')} value={form.mileage} onChangeText={(v) => onChange({ mileage: v })} keyboardType="numeric" placeholder="85000" />
              ) : (
                <Input label={t('create.price')} value={form.askingPrice} onChangeText={(v) => onChange({ askingPrice: v })} keyboardType="numeric" placeholder={t('create.pricePh')} />
              )}
            </View>
          </View>
          {isAutomobile ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Input label={t('create.price')} value={form.askingPrice} onChangeText={(v) => onChange({ askingPrice: v })} keyboardType="numeric" placeholder={t('create.pricePh')} />
            </>
          ) : null}
        </>
      )}

      <View style={{ height: spacing.sm }} />
      <Input label={t('create.description')} value={form.description} onChangeText={(v) => onChange({ description: v })} multiline placeholder={t('create.descriptionPh')} />
      <SourceSection source={source} url={url} onSource={onSource} onUrl={onUrl} urlError={urlError} />
      <View style={{ marginTop: spacing.lg }}>
        <Text style={[T.h3, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('create.photos', { count: photos.length, max: MAX_PHOTOS })}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={{ width: 96 }}>
              <Image
                source={{ uri: p.uri }}
                accessibilityRole="image"
                accessibilityLabel={t('create.photoAlt', { n: i + 1 })}
                style={{ width: 96, height: 96, borderRadius: radius.input }}
              />
              <Pressable
                onPress={() => onRemovePhoto(i)}
                accessibilityRole="button"
                accessibilityLabel={t('create.removePhoto', { n: i + 1 })}
                style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
              >
                <Trash2 size={16} color={colors.danger.main} strokeWidth={1.75} />
                <Text style={[T.caption, { color: colors.danger.main }]}>{t('common.remove')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {photos.length < MAX_PHOTOS ? (
          <Pressable
            onPress={onAddPhoto}
            disabled={photoBusy}
            accessibilityRole="button"
            accessibilityLabel={t('create.addPhoto')}
            style={{
              marginTop: spacing.sm,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.primary[500],
              borderRadius: radius.input,
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: photoBusy ? 0.6 : 1,
            }}
          >
            <Camera size={20} color={colors.primary[600]} strokeWidth={1.75} />
            <Text style={[T.bodyStrong, { color: colors.primary[600] }]}>
              {photoBusy ? t('create.photoLoading') : t('create.addPhoto')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {formError ? (
        <Text style={[T.caption, { color: colors.danger.main, marginTop: spacing.md }]}>{formError}</Text>
      ) : null}
    </View>
  );
}
