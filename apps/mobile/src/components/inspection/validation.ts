/**
 * P7.5/P7.10/P8.05 — Validation pure du formulaire de demande. Retourne des CLÉS
 * i18n (`validation.*`, résolues via `t()` à l'affichage) ou null si valide.
 * Aucune règle serveur modifiée : le serveur reste l'autorité.
 * Testée dans `tests/p7-inspection-form.test.ts` et `tests/p8-terrain-immobilier-mvp.test.ts`.
 */

export interface ObjectForm {
  title: string;
  askingPrice: string;
  description: string;
  // Biens mobiliers (automobile, électroménager, etc.)
  make: string;
  model: string;
  year: string;
  mileage: string;
  // Foncier & Immobilier
  propertyType: string;
  surfaceM2: string;
  cadastralRef: string;
  propertyPaper: string;
  gpsLat: string;
  gpsLng: string;
  // Foncier (terrain)
  topography: string;
  roadAccess: string;
  hasElectricity: boolean;
  hasWater: boolean;
  hasGas: boolean;
  hasSewage: boolean;
  boundaryFenced: boolean;
  // Bâti (immobilier)
  rooms: string;
  floors: string;
  condition: string;
  hasElevator: boolean;
}

export interface LocationForm {
  wilaya: string;
  commune: string;
  address: string;
}

export const MAX_PHOTOS = 8;

export type ListingSource = 'ECHRI' | 'FACEBOOK_MARKETPLACE' | 'OUEDKNISS' | 'OTHER';

export const LISTING_SOURCES: { key: ListingSource; labelKey: string; hintKey: string }[] = [
  { key: 'ECHRI', labelKey: 'marketplace.sourceECHRI', hintKey: 'create.sourceECHRIHint' },
  { key: 'FACEBOOK_MARKETPLACE', labelKey: 'marketplace.sourceFB', hintKey: 'create.sourceFBHint' },
  { key: 'OUEDKNISS', labelKey: 'marketplace.sourceOK', hintKey: 'create.sourceOKHint' },
  { key: 'OTHER', labelKey: 'marketplace.sourceOTHER', hintKey: 'create.sourceOTHERHint' },
];

export function sourceLabelKey(source: string | null | undefined): string {
  switch (source) {
    case 'FACEBOOK_MARKETPLACE':
      return 'marketplace.sourceFB';
    case 'OUEDKNISS':
      return 'marketplace.sourceOK';
    case 'OTHER':
      return 'marketplace.sourceOTHER';
    default:
      return 'marketplace.sourceECHRI';
  }
}

/** Hosts raisonnablement attendus par source (validation souple, §8). */
const SOURCE_HOSTS: Record<Exclude<ListingSource, 'ECHRI' | 'OTHER'>, string[]> = {
  FACEBOOK_MARKETPLACE: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com'],
  OUEDKNISS: ['ouedkniss.com', 'www.ouedkniss.com'],
};

/**
 * URL https uniquement (jamais javascript:/data:/file:, jamais de HTML).
 * ECHRI n'accepte aucune URL (normalisée à NULL côté service).
 * Retourne une clé `validation.*` ou null.
 */
export function validateListingUrl(raw: string, source: ListingSource): string | null {
  const trimmed = raw.trim();
  if (source === 'ECHRI') return null;
  if (!trimmed) return 'validation.urlRequired';
  if (trimmed.length > 2048) return 'validation.urlLong';
  if (/[<>"\s]/.test(trimmed)) return 'validation.urlChars';
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'validation.urlInvalid';
  }
  if (url.protocol !== 'https:') return 'validation.urlHttps';
  if (source !== 'OTHER') {
    const host = url.hostname.toLowerCase();
    const ok = SOURCE_HOSTS[source].some((h) => host === h || host.endsWith(`.${h.replace(/^www\./, '')}`));
    if (!ok) return 'validation.urlHost';
  }
  return null;
}

/** `true` uniquement pour une URL https (garde avant Linking.openURL). */
export function isOpenableHttpsUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    return new URL(raw.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateTitle(title: string): string | null {
  if (!title.trim()) return 'validation.titleRequired';
  if (title.trim().length < 3) return 'validation.titleShort';
  return null;
}

export function validatePrice(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'validation.priceInt';
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value <= 0) return 'validation.priceInt';
  if (value > 1000000000) return 'validation.priceHigh';
  return null;
}

export function parsePrice(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export function validateYear(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'validation.yearRequired';
  if (!/^\d{4}$/.test(trimmed)) return 'validation.yearDigits';
  const year = Number(trimmed);
  const current = new Date().getFullYear();
  if (year < 1900 || year > current + 1) return 'validation.yearRange';
  return null;
}

export function validateMileage(raw: string, required: boolean): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return required ? 'validation.mileageRequired' : null;
  if (!/^\d+$/.test(trimmed)) return 'validation.mileageInt';
  return null;
}

export function validateSurface(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'validation.surfaceRequired';
  const val = Number(trimmed);
  if (Number.isNaN(val) || val <= 0) return 'validation.surfacePositive';
  if (val > 100000000) return 'validation.surfaceHigh';
  return null;
}

export function validatePropertyType(raw: string): string | null {
  if (!raw.trim()) return 'validation.propertyTypeRequired';
  return null;
}

export function validateGpsCoordinate(raw: string, type: 'lat' | 'lng'): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const val = Number(trimmed);
  if (Number.isNaN(val)) return 'validation.gpsInvalid';
  if (type === 'lat' && (val < -90 || val > 90)) return 'validation.gpsRangeLat';
  if (type === 'lng' && (val < -180 || val > 180)) return 'validation.gpsRangeLng';
  return null;
}

export function validateGpsCoordinates(latStr: string, lngStr: string): string | null {
  const latTrim = latStr.trim();
  const lngTrim = lngStr.trim();
  if (!latTrim && !lngTrim) return null;
  if ((latTrim && !lngTrim) || (!latTrim && lngTrim)) return 'validation.gpsBothOrNone';
  return validateGpsCoordinate(latTrim, 'lat') || validateGpsCoordinate(lngTrim, 'lng');
}

export function validateObjectForm(
  form: ObjectForm,
  categoryOrAuto: boolean | string | undefined = false
): string | null {
  const catCode = typeof categoryOrAuto === 'boolean'
    ? (categoryOrAuto ? 'automobile' : 'autre')
    : (categoryOrAuto?.toLowerCase() || 'autre');

  if (catCode === 'terrain') {
    return (
      validateTitle(form.title) ??
      validatePropertyType(form.propertyType) ??
      validateSurface(form.surfaceM2) ??
      validatePrice(form.askingPrice) ??
      validateGpsCoordinates(form.gpsLat, form.gpsLng)
    );
  }

  if (catCode === 'immobilier') {
    return (
      validateTitle(form.title) ??
      validatePropertyType(form.propertyType) ??
      validateSurface(form.surfaceM2) ??
      validatePrice(form.askingPrice) ??
      validateGpsCoordinates(form.gpsLat, form.gpsLng)
    );
  }

  const isAuto = catCode === 'automobile';
  return (
    validateTitle(form.title) ??
    validatePrice(form.askingPrice) ??
    (form.make.trim() ? null : 'validation.brandRequired') ??
    (form.model.trim() ? null : 'validation.modelRequired') ??
    validateYear(form.year) ??
    validateMileage(form.mileage, isAuto)
  );
}

export function validateLocationForm(form: LocationForm): string | null {
  if (!form.wilaya.trim()) return 'validation.wilayaRequired';
  if (!form.commune.trim()) return 'validation.communeRequired';
  return null;
}

export function validateDateParts(datePart: string, timePart: string): string | null {
  const date = datePart.trim();
  if (!date) return 'validation.dateRequired';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'validation.dateFormat';
  const time = timePart.trim() || '09:00';
  if (!/^\d{2}:\d{2}$/.test(time)) return 'validation.timeFormat';
  const when = new Date(`${date}T${time}:00`);
  if (Number.isNaN(when.getTime())) return 'validation.dateInvalid';
  if (when.getTime() <= Date.now()) return 'validation.dateFuture';
  return null;
}

export function buildScheduledAt(datePart: string, timePart: string): string {
  return `${datePart.trim()}T${(timePart.trim() || '09:00')}:00`;
}

export function buildLocationAddress(form: LocationForm): string {
  const parts = [form.address.trim(), form.commune.trim(), form.wilaya.trim()].filter(Boolean);
  return parts.join(', ');
}

export interface FlowState {
  categoryId: string | null;
  object: ObjectForm;
  location: LocationForm;
  serviceId: string | null;
  datePart: string;
  timePart: string;
}

export const EMPTY_OBJECT: ObjectForm = {
  title: '',
  askingPrice: '',
  description: '',
  make: '',
  model: '',
  year: '',
  mileage: '',
  propertyType: '',
  surfaceM2: '',
  cadastralRef: '',
  propertyPaper: '',
  gpsLat: '',
  gpsLng: '',
  topography: '',
  roadAccess: '',
  hasElectricity: false,
  hasWater: false,
  hasGas: false,
  hasSewage: false,
  boundaryFenced: false,
  rooms: '',
  floors: '',
  condition: '',
  hasElevator: false,
};

export const EMPTY_LOCATION: LocationForm = { wilaya: '', commune: '', address: '' };

/** Une étape future n'est accessible que si les prérequis sont remplis. */
export function canEnterStep(
  step: 1 | 2 | 3 | 4 | 5,
  state: FlowState,
  categoryOrAuto: boolean | string | undefined = false,
): boolean {
  if (step === 1) return true;
  if (!state.categoryId) return false;
  if (step === 2) return true;
  if (validateObjectForm(state.object, categoryOrAuto)) return false;
  if (step === 3) return true;
  if (validateLocationForm(state.location)) return false;
  if (step === 4) return true;
  if (!state.serviceId) return false;
  if (validateDateParts(state.datePart, state.timePart)) return false;
  return step === 5;
}

export function isFlowDirty(state: FlowState, photoCount: number): boolean {
  return (
    state.categoryId !== null ||
    Object.values(state.object).some((v) => (typeof v === 'string' ? v.trim() !== '' : Boolean(v))) ||
    Object.values(state.location).some((v) => v.trim() !== '') ||
    state.serviceId !== null ||
    state.datePart.trim() !== '' ||
    state.timePart.trim() !== '' ||
    photoCount > 0
  );
}
