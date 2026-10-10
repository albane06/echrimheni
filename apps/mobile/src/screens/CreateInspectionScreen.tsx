/**
 * P7.5/P7.6/P7.10 — Nouveau parcours de demande en 5 étapes. Réutilise
 * EXCLUSIVEMENT les services existants, dans l'ordre du flux audité :
 * createVehicleListing → (upload photos) → createBookingRequest → succès.
 * Le paiement reste postérieur (acceptation expert), comme aujourd'hui.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  createBookingRequest,
  createVehicleListing,
  getActiveServices,
  getApprovedExperts,
  getCategories,
  uploadListingPhoto,
  validateListingPhoto,
  LISTING_PHOTOS_MAX_COUNT,
} from '@echrimheni/database';
import { colors, spacing } from '../theme/tokens';
import { Button } from '../components/ui/Button';
import { Stepper } from '../components/ui/Progress';
import { CategoryStep, type Category } from '../components/inspection/CategoryStep';
import { LocationStep } from '../components/inspection/LocationStep';
import { ObjectStep, type LocalPhoto } from '../components/inspection/ObjectStep';
import { ReviewStep, SuccessView } from '../components/inspection/ReviewStep';
import { ServiceExpertStep, type ExpertRow, type ServiceRow } from '../components/inspection/ServiceExpertStep';
import {
  EMPTY_LOCATION,
  EMPTY_OBJECT,
  buildLocationAddress,
  buildScheduledAt,
  canEnterStep,
  isFlowDirty,
  parsePrice,
  sourceLabelKey,
  validateDateParts,
  validateListingUrl,
  validateLocationForm,
  validateObjectForm,
  type FlowState,
  type ListingSource,
  type LocationForm,
  type ObjectForm,
} from '../components/inspection/validation';
import { useLanguage } from '../i18n';

type Step = 1 | 2 | 3 | 4 | 5;

export function CreateInspectionScreen({
  onDone,
  onCancel,
}: {
  onDone: (bookingId: string) => void;
  onCancel: () => void;
}) {
  const { t, T } = useLanguage();
  const [step, setStep] = useState<Step>(1);
  const [maxReached, setMaxReached] = useState<Step>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [object, setObject] = useState<ObjectForm>(EMPTY_OBJECT);
  const [source, setSource] = useState<ListingSource>('ECHRI');
  const [sourceUrl, setSourceUrl] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [location, setLocation] = useState<LocationForm>(EMPTY_LOCATION);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [expertId, setExpertId] = useState<string | null>(null);
  const [datePart, setDatePart] = useState('');
  const [timePart, setTimePart] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcError, setSvcError] = useState<string | null>(null);
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  const [stepError, setStepError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ bookingId: string; title: string; price: number } | null>(null);
  const createdListingId = useRef<string | null>(null);
  const submitted = useRef(false);

  const category = useMemo(() => categories.find((c) => c.id === categoryId) ?? null, [categories, categoryId]);
  const isAutomobile = (category?.code ?? '') === 'automobile';
  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const expert = useMemo(() => experts.find((e) => e.id === expertId) ?? null, [experts, expertId]);
  const flowState: FlowState = useMemo(
    () => ({ categoryId, object, location, serviceId, datePart, timePart }),
    [categoryId, object, location, serviceId, datePart, timePart],
  );
  const sourceUrlError = validateListingUrl(sourceUrl, source);
  const dirty = isFlowDirty(flowState, photos.length) || createdListingId.current !== null || source !== 'ECHRI' || sourceUrl.trim() !== '';

  /** Résout une clé de validation (avec variables) ou laisse passer le texte backend brut. */
  const trError = useCallback(
    (key: string | null): string | null => {
      if (!key) return null;
      if (key === 'validation.yearRange') {
        return t(key, { max: new Date().getFullYear() + 1 });
      }
      if (key === 'validation.urlHost') {
        return t(key, { source: t(sourceLabelKey(source)) });
      }
      if (key.startsWith('validation.') || key.startsWith('create.') || key.startsWith('errors.')) {
        return t(key);
      }
      return key;
    },
    [t, source],
  );

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const cats = ((await getCategories()) ?? []) as Category[];
      setCategories(cats.filter((c) => (c as { is_active?: boolean }).is_active !== false));
    } catch (err: unknown) {
      setCatError(err instanceof Error ? err.message : t('errors.loadFail'));
    } finally {
      setCatLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const loadStep4 = useCallback(async () => {
    if (!categoryId) return;
    setSvcLoading(true);
    setSvcError(null);
    setExpLoading(true);
    setExpError(null);
    try {
      const svcs = ((await getActiveServices()) ?? []) as (ServiceRow & { category_id?: string })[];
      setServices(svcs.filter((s) => (s as { category_id?: string }).category_id === categoryId));
    } catch (err: unknown) {
      setSvcError(err instanceof Error ? err.message : t('errors.loadFail'));
      setServices([]);
    } finally {
      setSvcLoading(false);
    }
    try {
      const list = ((await getApprovedExperts()) ?? []) as ExpertRow[];
      setExperts(list);
    } catch (err: unknown) {
      setExpError(err instanceof Error ? err.message : t('errors.loadFail'));
      setExperts([]);
    } finally {
      setExpLoading(false);
    }
  }, [categoryId, t]);

  useEffect(() => {
    if (step === 4 && services.length === 0 && !svcLoading) void loadStep4();
  }, [step, services.length, svcLoading, loadStep4]);

  const goTo = useCallback(
    (next: Step) => {
      if (next > maxReached && !canEnterStep(next, flowState, isAutomobile)) return;
      setStepError(null);
      setStep(next);
      setMaxReached((m) => (next > m ? next : m));
    },
    [maxReached, flowState, isAutomobile],
  );

  const confirmCancel = useCallback(() => {
    if (!dirty) {
      onCancel();
      return;
    }
    Alert.alert(t('create.quitTitle'), t('create.quitMsg'), [
      { text: t('common.stay'), style: 'cancel' },
      { text: t('common.quit'), style: 'destructive', onPress: onCancel },
    ]);
  }, [dirty, onCancel, t]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (success) return false;
      if (step > 1) {
        goTo((step - 1) as Step);
        return true;
      }
      confirmCancel();
      return true;
    });
    return () => sub.remove();
  }, [step, success, goTo, confirmCancel]);

  const pickPhoto = useCallback(async () => {
    if (photos.length >= LISTING_PHOTOS_MAX_COUNT) return;
    setPhotoBusy(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets || picked.assets.length === 0) return;
      const asset = picked.assets[0];
      const res = await fetch(asset.uri);
      const buffer = await res.arrayBuffer();
      try {
        validateListingPhoto(asset.mimeType || 'image/jpeg', buffer.byteLength);
      } catch (err: unknown) {
        setStepError(err instanceof Error ? err.message : t('errors.validation'));
        return;
      }
      setPhotos((prev) =>
        prev.length >= LISTING_PHOTOS_MAX_COUNT
          ? prev
          : [...prev, { uri: asset.uri, fileName: asset.fileName || 'annonce.jpg', mimeType: asset.mimeType || 'image/jpeg' }],
      );
    } catch (err: unknown) {
      setStepError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setPhotoBusy(false);
    }
  }, [photos.length, t]);

  const next = () => {
    setStepError(null);
    if (step === 1 && !categoryId) {
      setStepError('validation.categoryRequired');
      return;
    }
    if (step === 2) {
      const err = validateObjectForm(object, isAutomobile) ?? validateListingUrl(sourceUrl, source);
      if (err) {
        setStepError(err);
        return;
      }
    }
    if (step === 3) {
      const err = validateLocationForm(location);
      if (err) {
        setStepError(err);
        return;
      }
    }
    if (step === 4) {
      if (!serviceId) {
        setStepError('validation.serviceRequired');
        return;
      }
      const err = validateDateParts(datePart, timePart);
      if (err) {
        setStepError(err);
        return;
      }
    }
    goTo((step + 1) as Step);
  };

  const submit = useCallback(async () => {
    if (isSubmitting || submitted.current) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setPhotoWarning(null);
    try {
      let listingId = createdListingId.current;
      if (!listingId) {
        const listing = await createVehicleListing({
          categoryId: categoryId as string,
          title: object.title.trim(),
          make: object.make.trim(),
          model: object.model.trim(),
          year: Number(object.year.trim()),
          mileage: object.mileage.trim() ? Number(object.mileage.trim()) : undefined,
          askingPrice: parsePrice(object.askingPrice),
          locationWilaya: location.wilaya.trim(),
          locationCommune: location.commune.trim(),
          description: object.description.trim() || undefined,
          listingUrl: source === 'ECHRI' ? null : sourceUrl.trim(),
          sourcePlatform: source,
        });
        listingId = (listing as { id: string }).id;
        createdListingId.current = listingId;
      }
      for (const p of photos) {
        try {
          const res = await fetch(p.uri);
          const buffer = await res.arrayBuffer();
          await uploadListingPhoto({ listingId, fileName: p.fileName, mimeType: p.mimeType, data: buffer });
        } catch {
          setPhotoWarning(t('create.photoWarning'));
          break;
        }
      }
      const booking = await createBookingRequest({
        listingId,
        expertId: expertId || undefined,
        serviceId: serviceId as string,
        locationAddress: buildLocationAddress(location),
        scheduledAt: buildScheduledAt(datePart, timePart),
      });
      submitted.current = true;
      const created = booking as { id: string; price_total: number; status: string };
      setSuccess({ bookingId: created.id, title: object.title.trim(), price: created.price_total });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, categoryId, object, location, photos, expertId, serviceId, datePart, timePart, source, sourceUrl, t]);

  if (success) {
    return (
      <SuccessView
        bookingShortId={success.bookingId.slice(0, 8)}
        title={success.title}
        price={success.price}
        onSee={() => onDone(success.bookingId)}
        onHome={() => onDone(success.bookingId)}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stepper step={step} total={5} />
      {step === 1 && (
        <>
          {catLoading ? (
            <Text style={[T.body, { color: colors.text.secondary, marginTop: 16 }]}>
              {t('create.catLoading')}
            </Text>
          ) : catError ? (
            <>
              <Text style={[T.body, { color: colors.danger.main, marginTop: 16 }]}>
                {t('create.catFail')}
              </Text>
              <View style={{ marginTop: 12 }}>
                <Button title={t('common.retry')} variant="outline" onPress={() => void loadCategories()} />
              </View>
            </>
          ) : (
            <CategoryStep categories={categories} selectedId={categoryId} onSelect={(id) => { setCategoryId(id); setServiceId(null); setStepError(null); }} />
          )}
          {stepError ? (
            <Text style={[T.caption, { color: colors.danger.main, marginTop: 12 }]}>{trError(stepError)}</Text>
          ) : null}
        </>
      )}
      {step === 2 && (
        <ObjectStep
          form={object}
          onChange={(patch) => setObject((prev) => ({ ...prev, ...patch }))}
          isAutomobile={isAutomobile}
          photos={photos}
          onAddPhoto={() => void pickPhoto()}
          onRemovePhoto={(i) => setPhotos((prev) => prev.filter((_, j) => j !== i))}
          photoBusy={photoBusy}
          formError={trError(stepError)}
          source={source}
          url={sourceUrl}
          onSource={(s) => { setSource(s); setStepError(null); }}
          onUrl={setSourceUrl}
          urlError={sourceUrlError ? trError(sourceUrlError) : null}
        />
      )}
      {step === 3 && (
        <LocationStep
          form={location}
          onChange={(patch) => setLocation((prev) => ({ ...prev, ...patch }))}
          formError={trError(stepError)}
        />
      )}
      {step === 4 && (
        <ServiceExpertStep
          services={services}
          servicesLoading={svcLoading}
          servicesError={svcError ? t('create.servicesFail') : null}
          serviceId={serviceId}
          onService={(id) => { setServiceId(id); setStepError(null); }}
          experts={experts}
          expertsLoading={expLoading}
          expertsError={expError ? t('create.expertsFail') : null}
          expertId={expertId}
          onExpert={(id) => setExpertId(id)}
          datePart={datePart}
          timePart={timePart}
          onDate={setDatePart}
          onTime={setTimePart}
          formError={trError(stepError)}
        />
      )}
      {step === 5 && (
        <ReviewStep
          category={category}
          object={object}
          isAutomobile={isAutomobile}
          location={location}
          service={service}
          expert={expert}
          dateLabel={`${datePart.trim()} ${t('create.atWord')} ${timePart.trim() || '09:00'}`}
          photos={photos}
          source={source}
          sourceUrl={sourceUrl}
          submitError={submitError}
          photoWarning={photoWarning}
          isSubmitting={isSubmitting}
          onConfirm={() => void submit()}
          onEditSource={() => goTo(2)}
        />
      )}
      {step < 5 ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {step > 1 ? (
            <View style={{ flex: 1 }}>
              <Button title={t('common.back')} variant="outline" onPress={() => goTo((step - 1) as Step)} />
            </View>
          ) : null}
          <View style={{ flex: 2 }}>
            <Button title={t('create.continue')} variant="secondary" onPress={next} />
          </View>
        </View>
      ) : null}
      {step === 1 ? (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Button title={t('create.cancel')} variant="ghost" onPress={confirmCancel} />
        </View>
      ) : null}
    </ScrollView>
  );
}
