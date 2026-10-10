import { getSupabaseClient } from '../client.js';
import { Category, Service, ExpertProfile, Listing, Booking, InspectionReport } from '@echrimheni/shared';
import { resolveAuthorId, assertServiceMatchesListing, validateScheduledAt, ServiceError } from './ownership.js';

export const PAYMENT_ELIGIBLE_STATUSES = ['ACCEPTED', 'PAYMENT_PENDING'] as const;

export interface PaymentEligibilityContext {
  booking: { id: string; buyer_id: string; status: string } | null;
  callerId: string | null;
  callerRole: string | null;
}

/**
 * P5 — Éligibilité paiement (helper pur, testable, miroir des cas A–I).
 * Le serveur (migration 00006) applique les mêmes règles ; cette garde
 * applicative évite tout appel illégitime dès le client.
 */
export function validatePaymentEligibility(ctx: PaymentEligibilityContext): void {
  if (!ctx.callerId) {
    throw new ServiceError('AUTH', 'Session requise pour payer.');
  }
  if (!ctx.booking) {
    throw new ServiceError('NOT_FOUND', 'Réservation non trouvée.');
  }
  if (ctx.booking.buyer_id !== ctx.callerId) {
    throw new ServiceError(
      'FORBIDDEN',
      'Non autorisé : seul l’acheteur de la réservation peut payer.'
    );
  }
  if (ctx.callerRole !== 'BUYER') {
    throw new ServiceError('FORBIDDEN', 'Non autorisé : rôle BUYER requis pour payer.');
  }
  if (ctx.booking.status === 'PAID') {
    throw new ServiceError('BUSINESS', 'Paiement déjà effectué pour cette réservation.');
  }
  if (!(PAYMENT_ELIGIBLE_STATUSES as readonly string[]).includes(ctx.booking.status)) {
    throw new ServiceError(
      'BUSINESS',
      `Réservation non éligible au paiement (statut ${ctx.booking.status}).`
    );
  }
}

/**
 * P5 — Montant autoritatif : toujours le base_price du service, jamais la
 * valeur transmise par l'écran.
 */
export function resolvePayableAmount(serviceBasePrice: number | null | undefined): number {
  if (!serviceBasePrice || serviceBasePrice <= 0) {
    throw new ServiceError('VALIDATION', 'Service introuvable ou prix invalide.');
  }
  return serviceBasePrice;
}

/**
 * P3 — Id de l'utilisateur de la session courante (autorité unique côté client).
 * Lève une erreur AUTH si aucune session (jamais de fallback).
 */
export async function requireSessionUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const id = data.session?.user?.id;
  if (!id) {
    throw new ServiceError('AUTH', 'Session requise : connectez-vous pour continuer.');
  }
  return id;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return data as Category[];
}

export async function getAutomobileServices(): Promise<Service[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, categories!inner(code)')
    .eq('categories.code', 'automobile')
    .eq('is_active', true);
  if (error) throw error;
  return data as Service[];
}

/**
 * P6.3 — Tous les services actifs avec leur catégorie (sélecteur explicite
 * par annonce). Lecture seule, RLS publique du catalogue.
 */
export async function getActiveServices(): Promise<Service[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, categories!inner(id, code, name)')
    .eq('is_active', true)
    .order('base_price', { ascending: true });
  if (error) throw error;
  return data as Service[];
}

export type ExpertSort = 'rating' | 'price';

export interface ExpertSearchOptions {
  wilaya?: string;
  specialty?: string;
  search?: string;
  sort?: ExpertSort;
}

/**
 * P6.4-B — Normalisation pure des filtres (testable) : trim, vide → undefined,
 * tri limité à la whitelist. Aucun accès réseau.
 */
export function normalizeExpertFilters(
  options?: string | ExpertSearchOptions | null
): { wilaya?: string; specialty?: string; search?: string; sort?: ExpertSort } {
  const raw: ExpertSearchOptions =
    typeof options === 'string' ? { wilaya: options } : options || {};
  const clean = (v?: string | null) => {
    const t = (v || '').trim();
    return t.length > 0 ? t : undefined;
  };
  const sort = raw.sort === 'rating' || raw.sort === 'price' ? raw.sort : undefined;
  return { wilaya: clean(raw.wilaya), specialty: clean(raw.specialty), search: clean(raw.search), sort };
}

export async function getApprovedExperts(
  wilayaOrOptions?: string | ExpertSearchOptions
): Promise<(ExpertProfile & { full_name: string; phone: string })[]> {
  const supabase = getSupabaseClient();
  const filters = normalizeExpertFilters(wilayaOrOptions);
  // APPROVED seul, toujours : jointure inner + égalité fixe, jamais de statut
  // fourni par l'appelant. Requêtes paramétrées (pas de SQL concaténé).
  let query = supabase
    .from('expert_profiles')
    .select('*, profiles!inner(full_name, phone), expert_documents!inner(verification_status)')
    .eq('expert_documents.verification_status', 'APPROVED');

  if (filters.wilaya) {
    query = query.ilike('wilaya', `%${filters.wilaya}%`);
  }
  if (filters.specialty) {
    query = query.contains('specialties', [filters.specialty]);
  }
  if (filters.search) {
    query = query.ilike('profiles.full_name', `%${filters.search}%`);
  }

  if (filters.sort === 'price') {
    query = query
      .order('fixed_rate', { ascending: true, nullsFirst: false })
      .order('rating_avg', { ascending: false })
      .order('id', { ascending: true });
  } else if (filters.sort === 'rating') {
    query = query
      .order('rating_avg', { ascending: false })
      .order('rating_count', { ascending: false })
      .order('id', { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    full_name: row.profiles?.full_name || '',
    phone: row.profiles?.phone || ''
  }));
}

export async function createVehicleListing(params: {
  buyerId?: string;
  categoryId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  askingPrice?: number;
  locationWilaya: string;
  locationCommune: string;
  description?: string;
  photos?: string[];
  /** P7.6 — optionnel, rétrocompatible : omis = comportement historique. */
  listingUrl?: string | null;
  /** P7.6 — optionnel, défaut 'ECHRI'. */
  sourcePlatform?: 'ECHRI' | 'FACEBOOK_MARKETPLACE' | 'OUEDKNISS' | 'OTHER';
}): Promise<Listing> {
  const supabase = getSupabaseClient();
  // P3 — buyer_id dérivé de la session, jamais d'un UUID arbitraire d'écran.
  const sessionUserId = await requireSessionUserId();
  const buyerId = resolveAuthorId(sessionUserId, params.buyerId, 'listing');
  // P7.6 — normalisation : ECHRI + URL = URL ignorée (NULL) ; les clés ne
  // sont envoyées que si la fonctionnalité est utilisée, afin que les
  // anciens appels restent strictement identiques (y compris avant
  // application de la migration 20260912000011).
  const sourcePlatform = params.sourcePlatform ?? 'ECHRI';
  const listingUrl = sourcePlatform === 'ECHRI' ? null : params.listingUrl?.trim() || null;
  const withSource = sourcePlatform !== 'ECHRI';
  const { data, error } = await supabase
    .from('listings')
    .insert({
      buyer_id: buyerId,
      category_id: params.categoryId,
      title: params.title,
      make: params.make,
      model: params.model,
      year: params.year,
      mileage: params.mileage,
      asking_price: params.askingPrice,
      location_wilaya: params.locationWilaya,
      location_commune: params.locationCommune,
      description: params.description,
      photos: params.photos || [],
      ...(withSource ? { listing_url: listingUrl, source_platform: sourcePlatform } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Listing;
}

export async function createBookingRequest(params: {
  listingId: string;
  buyerId?: string;
  expertId?: string;
  serviceId: string;
  locationAddress: string;
  scheduledAt?: string;
}): Promise<Booking> {
  const supabase = getSupabaseClient();

  // P3 — buyer_id dérivé de la session ; le listing doit appartenir à la session
  // (invisible sinon via RLS → refus explicite, jamais de contournement).
  const sessionUserId = await requireSessionUserId();
  const buyerId = resolveAuthorId(sessionUserId, params.buyerId, 'booking');

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, buyer_id, category_id')
    .eq('id', params.listingId)
    .single();
  if (listingError || !listing || listing.buyer_id !== sessionUserId) {
    throw new ServiceError(
      'FORBIDDEN',
      'Réservation refusée : ce listing ne vous appartient pas ou est introuvable.'
    );
  }

  // P6.3 — le service doit appartenir à la catégorie du listing ; le prix est
  // l'autorité serveur (services.base_price), jamais une valeur d'écran.
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, category_id, base_price')
    .eq('id', params.serviceId)
    .eq('is_active', true)
    .single();
  if (serviceError || !service) {
    throw new ServiceError('NOT_FOUND', 'Service introuvable ou inactif.');
  }
  assertServiceMatchesListing(
    service as { id: string; category_id: string },
    (listing as { category_id: string }).category_id
  );
  const priceTotal = (service as { base_price: number }).base_price;
  if (!priceTotal || priceTotal <= 0) {
    throw new ServiceError('VALIDATION', 'Prix du service invalide.');
  }

  const commissionPlatform = Math.round(priceTotal * 0.15);
  const expertPayout = priceTotal - commissionPlatform;

  // P6.3 — date/heure souhaitée (optionnelle) : ISO future ; la colonne reste
  // libre côté serveur dans ce MVP (aucune contrainte CHECK ajoutée).
  const scheduledAt = params.scheduledAt ? validateScheduledAt(params.scheduledAt) : null;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: params.listingId,
      buyer_id: buyerId,
      expert_id: params.expertId || null,
      service_id: params.serviceId,
      location_address: params.locationAddress,
      price_total: priceTotal,
      commission_platform: commissionPlatform,
      expert_payout: expertPayout,
      scheduled_at: scheduledAt,
      status: 'BOOKING_REQUESTED'
    })
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function getBuyerReport(bookingId: string): Promise<InspectionReport | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw error;
  return data as InspectionReport;
}

/**
 * P6.7-B — Validation profil (pure, testable) : nom et téléphone requis.
 * Le rôle n'est jamais modifiable côté client (verrou RLS serveur).
 */
export function validateProfileInput(input: { fullName: string; phone: string }): void {
  if (!input.fullName.trim() || !input.phone.trim()) {
    throw new ServiceError('VALIDATION', 'Nom complet et téléphone sont requis.');
  }
}

/**
 * P6.7-B — Modification du profil connecté uniquement (id = session).
 * La RLS impose id = auth.uid() ET rôle inchangé : toute tentative sur un
 * autre profil ou sur le rôle est refusée par le serveur, jamais par l'UI.
 */
export async function updateMyProfile(params: { fullName: string; phone: string }) {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  validateProfileInput(params);
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: params.fullName.trim(), phone: params.phone.trim(), updated_at: new Date().toISOString() })
    .eq('id', sessionUserId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * P3 — Listings du Buyer connecté (RLS : buyer_id = auth.uid()).
 * Jamais de buyer_id arbitraire.
 */
export async function getMyListings(): Promise<Listing[]> {  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('listings')
    .select('*, categories(code, name)')
    .eq('buyer_id', sessionUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Listing[];
}

/**
 * P3 — Bookings du Buyer connecté avec relations (RLS : partie prenante).
 */
export async function getMyBookings(): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listings(title, make, model, year, location_wilaya, listing_url, source_platform), reports(score, is_published)')
    .eq('buyer_id', sessionUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Booking[];
}

/**
 * P5 — Paiement via la RPC serveur process_payment_rpc (idempotente).
 * Montant dérivé du base_price du service côté service (jamais d'autorité
 * client) ; propriété et éligibilité vérifiées avant tout appel RPC.
 */
export async function processPayment(params: {
  bookingId: string;
  method?: string;
  transactionRef: string;
}) {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  if (!params.transactionRef || params.transactionRef.trim().length === 0) {
    throw new ServiceError('VALIDATION', 'Référence de transaction requise.');
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, buyer_id, status, service_id')
    .eq('id', params.bookingId)
    .single();
  if (bookingError || !booking) {
    throw new ServiceError('NOT_FOUND', 'Réservation non trouvée.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionUserId)
    .single();

  validatePaymentEligibility({
    booking: booking as { id: string; buyer_id: string; status: string },
    callerId: sessionUserId,
    callerRole: (profile as { role: string } | null)?.role ?? null,
  });

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('base_price')
    .eq('id', (booking as { service_id: string }).service_id)
    .single();
  if (serviceError || !service) {
    throw new ServiceError('VALIDATION', 'Service introuvable pour cette réservation.');
  }
  const amount = resolvePayableAmount((service as { base_price: number }).base_price);

  const { data, error } = await supabase.rpc('process_payment_rpc', {
    p_booking_id: params.bookingId,
    p_amount: amount,
    p_method: params.method || 'SANDBOX',
    p_transaction_ref: params.transactionRef
  });

  if (error) throw error;
  return data;
}

export const LISTING_PHOTOS_BUCKET = 'listing-photos';
export const LISTING_PHOTOS_MAX_BYTES = 10 * 1024 * 1024;
export const LISTING_PHOTOS_MAX_COUNT = 8;
const ALLOWED_LISTING_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * P6.2-A — Validation photo d'annonce (pure, testable).
 */
export function validateListingPhoto(mimeType: string, byteLength: number): void {
  if (!ALLOWED_LISTING_MIME_TYPES.includes(mimeType)) {
    throw new ServiceError(
      'VALIDATION',
      `Type de fichier refusé (${mimeType}). Images JPEG, PNG ou WebP uniquement.`
    );
  }
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    throw new ServiceError('VALIDATION', 'Fichier vide ou illisible.');
  }
  if (byteLength > LISTING_PHOTOS_MAX_BYTES) {
    throw new ServiceError('VALIDATION', 'Photo trop lourde (10 Mo maximum).');
  }
}

/**
 * P6.2-A — Chemin Storage d'une photo d'annonce (pur, testable).
 * Dossier du buyer : <buyer_id>/<listing_id>/<fichier>. Jamais une autorisation.
 */
export function buildListingPhotoPath(buyerId: string, listingId: string, fileName: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const safe = /[a-zA-Z0-9]/.test(cleaned) ? cleaned : 'photo.jpg';
  return `${buyerId}/${listingId}/${Date.now()}-${safe}`;
}

/**
 * P6.2-A — Upload photo d'annonce : listing du buyer connecté uniquement,
 * bucket privé, URL persistée dans listings.photos (colonne existante).
 */
export async function uploadListingPhoto(params: {
  listingId: string;
  fileName: string;
  mimeType: string;
  data: ArrayBuffer | Uint8Array;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const byteLength =
    params.data instanceof Uint8Array ? params.data.byteLength : params.data.byteLength;
  validateListingPhoto(params.mimeType, byteLength);

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, buyer_id, photos')
    .eq('id', params.listingId)
    .single();
  if (listingError || !listing || (listing as any).buyer_id !== sessionUserId) {
    throw new ServiceError(
      'FORBIDDEN',
      'Upload refusé : cette annonce ne vous appartient pas.'
    );
  }

  const currentPhotos: string[] = (listing as any).photos || [];
  if (currentPhotos.length >= LISTING_PHOTOS_MAX_COUNT) {
    throw new ServiceError(
      'VALIDATION',
      `Maximum ${LISTING_PHOTOS_MAX_COUNT} photos par annonce.`
    );
  }

  const path = buildListingPhotoPath(sessionUserId, params.listingId, params.fileName);
  const { error: uploadError } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(path, params.data as any, { contentType: params.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const photoUrl = `${LISTING_PHOTOS_BUCKET}/${path}`;
  const { error: updateError } = await supabase
    .from('listings')
    .update({ photos: [...currentPhotos, photoUrl] })
    .eq('id', params.listingId);
  if (updateError) throw updateError;
  return photoUrl;
}

/**
 * P6.2-A — Suppression sécurisée d'une photo d'annonce (propriétaire uniquement).
 */
export async function removeListingPhoto(params: { listingId: string; photoUrl: string }): Promise<void> {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, buyer_id, photos')
    .eq('id', params.listingId)
    .single();
  if (listingError || !listing || (listing as any).buyer_id !== sessionUserId) {
    throw new ServiceError(
      'FORBIDDEN',
      'Suppression refusée : cette annonce ne vous appartient pas.'
    );
  }

  const currentPhotos: string[] = (listing as any).photos || [];
  if (!currentPhotos.includes(params.photoUrl)) {
    throw new ServiceError('NOT_FOUND', 'Photo introuvable sur cette annonce.');
  }

  const path = params.photoUrl.startsWith(`${LISTING_PHOTOS_BUCKET}/`)
    ? params.photoUrl.slice(LISTING_PHOTOS_BUCKET.length + 1)
    : null;
  if (!path || !path.startsWith(`${sessionUserId}/${params.listingId}/`)) {
    throw new ServiceError('FORBIDDEN', 'Chemin de photo non autorisé.');
  }

  await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove([path]);
  const { error: updateError } = await supabase
    .from('listings')
    .update({ photos: currentPhotos.filter(p => p !== params.photoUrl) })
    .eq('id', params.listingId);
  if (updateError) throw updateError;
}

/**
 * P6.2-A — URL signée de lecture d'une photo d'annonce (RLS : règles du bucket).
 */
export async function getListingPhotoSignedUrl(photoUrl: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  if (!photoUrl.startsWith(`${LISTING_PHOTOS_BUCKET}/`)) {
    throw new ServiceError('VALIDATION', 'URL de photo invalide.');
  }
  const path = photoUrl.slice(LISTING_PHOTOS_BUCKET.length + 1);
  const { data, error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl || null;
}
