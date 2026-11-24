import { getSupabaseClient } from '../client.js';
import {
  InspectionSection,
  InspectionItem,
  ItemStatus,
  SeverityLevel,
  ExpertVerificationStatus,
  calculateInspectionScore,
  validateRequiredItemsCompleted,
  AnswerWithItem
} from '@echrimheni/shared';
import { requireSessionUserId } from './buyer.js';
import { ServiceError } from './ownership.js';

/**
 * P4 — Statut expert dérivé d'un document éventuel (helper pur, testable).
 * Sans document → PENDING. Jamais d'APPROVED par défaut.
 */
export function deriveExpertStatus(
  doc: { verification_status?: string | null } | null | undefined
): ExpertVerificationStatus {
  const status = doc?.verification_status;
  if (status === 'APPROVED' || status === 'REJECTED' || status === 'SUSPENDED') {
    return status;
  }
  return 'PENDING';
}

/**
 * P4 — Seul un expert APPROVED peut opérer (helper pur, testable).
 */
export function assertExpertOperable(status: ExpertVerificationStatus | null | undefined): void {
  if (status !== 'APPROVED') {
    throw new ServiceError(
      'FORBIDDEN',
      `Opération expert refusée : statut actuel '${status || 'INCONNU'}', APPROVED requis.`
    );
  }
}

/**
 * P4 — Vérifie qu'un template appartient bien au service du booking (pur).
 * Empêche de charger arbitrairement un autre template.
 */
export function assertTemplateMatchesService(
  template: { id: string; service_id: string } | null | undefined,
  serviceId: string
): void {
  if (!template || template.service_id !== serviceId) {
    throw new ServiceError(
      'VALIDATION',
      'Checklist refusée : le template ne correspond pas au service de la mission.'
    );
  }
}

/**
 * P4 — Profil expert de la session (identité dérivée, aucun expertId arbitraire).
 */
export async function getMyExpertProfile() {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('expert_profiles')
    .select('*, profiles!inner(id, full_name, phone, created_at), expert_documents(*)')
    .eq('id', sessionUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ServiceError('NOT_FOUND', 'Profil expert introuvable pour cette session.');
  }
  const row = data as any;
  const embedded = row.expert_documents;
  const doc = Array.isArray(embedded) ? embedded[0] || null : embedded || null;
  return {
    ...row,
    verification_status: deriveExpertStatus(doc),
    expert_document: doc,
  };
}

/**
 * P4 — Missions accessibles à l'expert connecté (filtrage serveur/RLS).
 */
export async function getMyExpertBookings() {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      '*, listings(title, make, model, year, location_wilaya, location_commune, listing_url, source_platform, category_id, categories(code, name), listing_real_estate(*)), services(name, base_price, category_id), reports(score, is_published)'
    )
    .eq('expert_id', sessionUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export const INSPECTION_MEDIA_BUCKET = 'inspection-media';
export const INSPECTION_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * P5 — Validation média (pure, testable) : type image autorisé, taille bornée.
 */
export function validateInspectionMedia(mimeType: string, byteLength: number): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new ServiceError(
      'VALIDATION',
      `Type de fichier refusé (${mimeType}). Images JPEG, PNG ou WebP uniquement.`
    );
  }
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    throw new ServiceError('VALIDATION', 'Fichier vide ou illisible.');
  }
  if (byteLength > INSPECTION_MEDIA_MAX_BYTES) {
    throw new ServiceError('VALIDATION', 'Photo trop lourde (10 Mo maximum).');
  }
}

/**
 * P5 — Chemin Storage déterministe et traçable (pur, testable).
 * Le path n'est JAMAIS une autorisation : RLS + session décident.
 */
export function buildMediaPath(expertId: string, sessionId: string, fileName: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const safe = /[a-zA-Z0-9]/.test(cleaned) ? cleaned : 'photo.jpg';
  return `${expertId}/${sessionId}/${Date.now()}-${safe}`;
}

/**
 * P5 — Upload photo d'inspection : expert APPROVED, session assignée,
 * bucket privé, ligne inspection_media liée (RLS).
 */
export async function uploadInspectionMedia(params: {
  sessionId: string;
  itemId?: string;
  fileName: string;
  mimeType: string;
  data: ArrayBuffer | Uint8Array;
}) {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const byteLength =
    params.data instanceof Uint8Array ? params.data.byteLength : params.data.byteLength;
  validateInspectionMedia(params.mimeType, byteLength);

  const { data: inspSession, error: sessError } = await supabase
    .from('inspection_sessions')
    .select('id, expert_id, booking_id')
    .eq('id', params.sessionId)
    .single();
  if (sessError || !inspSession || inspSession.expert_id !== sessionUserId) {
    throw new ServiceError(
      'FORBIDDEN',
      "Upload refusé : cette session d'inspection ne vous est pas assignée."
    );
  }

  const { data: doc, error: docError } = await supabase
    .from('expert_documents')
    .select('verification_status')
    .eq('expert_id', sessionUserId)
    .maybeSingle();
  if (docError) throw docError;
  assertExpertOperable(deriveExpertStatus(doc as any));

  const path = buildMediaPath(sessionUserId, params.sessionId, params.fileName);
  const { error: uploadError } = await supabase.storage
    .from(INSPECTION_MEDIA_BUCKET)
    .upload(path, params.data as any, { contentType: params.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('inspection_media')
    .insert({
      session_id: params.sessionId,
      item_id: params.itemId || null,
      media_url: `${INSPECTION_MEDIA_BUCKET}/${path}`,
      media_type: 'IMAGE'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * P5 — Médias d'une session avec URLs signées (lecture RLS : session de l'expert).
 */
export async function getSessionMedia(sessionId: string) {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const { data: inspSession, error: sessError } = await supabase
    .from('inspection_sessions')
    .select('id, expert_id')
    .eq('id', sessionId)
    .single();
  if (sessError || !inspSession || inspSession.expert_id !== sessionUserId) {
    throw new ServiceError('FORBIDDEN', 'Accès refusé à cette session.');
  }

  const { data, error } = await supabase
    .from('inspection_media')
    .select('id, item_id, media_url, media_type, caption, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return Promise.all(
    (data || []).map(async (m: any) => {
      const raw: string = m.media_url || '';
      const path = raw.startsWith(`${INSPECTION_MEDIA_BUCKET}/`)
        ? raw.slice(INSPECTION_MEDIA_BUCKET.length + 1)
        : raw;
      const { data: signedData } = await supabase.storage
        .from(INSPECTION_MEDIA_BUCKET)
        .createSignedUrl(path, 3600);
      return { ...m, signed_url: signedData?.signedUrl || null };
    })
  );
}

export async function submitExpertDocuments(params: {
  expertId: string;
  identityDocumentUrl: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  businessRegistrationUrl: string;
  businessRegistrationNumber: string;
  businessName: string;
  businessActivity: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expert_documents')
    .upsert({
      expert_id: params.expertId,
      identity_document_url: params.identityDocumentUrl,
      identity_document_type: params.identityDocumentType,
      identity_document_number: params.identityDocumentNumber,
      business_registration_url: params.businessRegistrationUrl,
      business_registration_number: params.businessRegistrationNumber,
      business_name: params.businessName,
      business_activity: params.businessActivity,
      verification_status: 'PENDING'
    }, { onConflict: 'expert_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * P6.7-A — Dossier de l'expert connecté (lecture RLS : propre ligne ou admin).
 * null si aucune candidature soumise (statut implicite : à candidater).
 */
export async function getMyExpertDocument() {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('expert_documents')
    .select('*')
    .eq('expert_id', sessionUserId)
    .maybeSingle();
  if (error) throw error;
  return data as {
    expert_id: string;
    verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    rejection_reason: string | null;
    created_at: string;
  } | null;
}

export const EXPERT_DOCUMENTS_BUCKET = 'expert-documents';
export const EXPERT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * P6.7-A — Validation document (pure, testable) : PDF ou image, taille bornée
 * par la limite du bucket privé expert-documents.
 */
export function validateExpertDocument(mimeType: string, byteLength: number): void {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
    throw new ServiceError(
      'VALIDATION',
      `Type de fichier refusé (${mimeType}). PDF, JPEG ou PNG uniquement.`
    );
  }
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    throw new ServiceError('VALIDATION', 'Fichier vide ou illisible.');
  }
  if (byteLength > EXPERT_DOCUMENT_MAX_BYTES) {
    throw new ServiceError('VALIDATION', 'Document trop lourd (10 Mo maximum).');
  }
}

/**
 * P6.7-A — Chemin Storage d'un document expert (pur, testable) : dossier
 * `<uid>/…` exigé par la policy RLS. Le path n'est JAMAIS une autorisation.
 */
export function buildExpertDocumentPath(expertId: string, fileName: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const safe = /[a-zA-Z0-9]/.test(cleaned) ? cleaned : 'document.pdf';
  return `${expertId}/${Date.now()}-${safe}`;
}

/**
 * P6.7-A — Upload d'une pièce du dossier (CNI/RC) : identité dérivée de la
 * session, bucket privé, jamais d'URL publique. Retourne le chemin de stockage
 * `expert-documents/<uid>/…` à passer à submitMyExpertDocuments.
 */
export async function uploadExpertDocument(params: {
  fileName: string;
  mimeType: string;
  data: ArrayBuffer | Uint8Array;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const byteLength =
    params.data instanceof Uint8Array ? params.data.byteLength : params.data.byteLength;
  validateExpertDocument(params.mimeType, byteLength);

  const path = buildExpertDocumentPath(sessionUserId, params.fileName);
  const { error: uploadError } = await supabase.storage
    .from(EXPERT_DOCUMENTS_BUCKET)
    .upload(path, params.data as any, { contentType: params.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  return `${EXPERT_DOCUMENTS_BUCKET}/${path}`;
}

/**
 * P6.7-A — Soumission du dossier avec identité de session (jamais d'expertId
 * arbitraire). Première soumission = INSERT autorisé RLS ; le statut est
 * toujours forcé à PENDING côté service. Toute resoumission d'une ligne
 * existante est refusée par la RLS (UPDATE admin-only) : l'UI doit donc
 * vérifier getMyExpertDocument() avant et ne jamais resoumettre aveuglément.
 */
export async function submitMyExpertDocuments(params: {
  identityDocumentUrl: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  businessRegistrationUrl: string;
  businessRegistrationNumber: string;
  businessName: string;
  businessActivity: string;
}) {
  const sessionUserId = await requireSessionUserId();
  return submitExpertDocuments({ ...params, expertId: sessionUserId });
}

/**
 * P6.7-A — Spécialités/zones du profil expert connecté (update RLS own autorisé
 * par la policy FOR ALL). Appelé une fois à la candidature ; jamais ADMIN.
 */
export async function updateMyExpertProfile(params: {
  specialties: string[];
  wilaya?: string;
  commune?: string;
  bio?: string;
}) {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const specialties = (params.specialties || []).map(s => s.trim()).filter(Boolean);
  if (specialties.length === 0) {
    throw new ServiceError('VALIDATION', 'Sélectionnez au moins une spécialité.');
  }

  const patch: Record<string, unknown> = { specialties, updated_at: new Date().toISOString() };
  if (params.wilaya?.trim()) patch.wilaya = params.wilaya.trim();
  if (params.commune?.trim()) patch.commune = params.commune.trim();
  if (params.bio !== undefined) patch.bio = params.bio;

  const { data, error } = await supabase
    .from('expert_profiles')
    .update(patch)
    .eq('id', sessionUserId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * P6.7-A — Validation du formulaire de candidature (pure, testable).
 */
export function validateExpertOnboardingInput(input: {
  fullName: string;
  phone: string;
  wilaya: string;
  specialties: string[];
  identityDocumentNumber: string;
  businessRegistrationNumber: string;
  businessName: string;
  businessActivity: string;
  hasIdentityFile: boolean;
  hasRegistrationFile: boolean;
}): void {
  const missing: string[] = [];
  if (!input.fullName.trim()) missing.push('nom complet');
  if (!input.phone.trim()) missing.push('téléphone');
  if (!input.wilaya.trim()) missing.push('wilaya');
  if (input.specialties.length === 0) missing.push('spécialité');
  if (!input.identityDocumentNumber.trim()) missing.push('numéro de pièce d’identité');
  if (!input.businessRegistrationNumber.trim()) missing.push('numéro de registre de commerce');
  if (!input.businessName.trim()) missing.push('raison sociale');
  if (!input.businessActivity.trim()) missing.push('activité déclarée');
  if (!input.hasIdentityFile) missing.push('photo/scan de la pièce d’identité');
  if (!input.hasRegistrationFile) missing.push('photo/scan du registre de commerce');
  if (missing.length > 0) {
    throw new ServiceError('VALIDATION', `Champs requis manquants : ${missing.join(', ')}.`);
  }
}

/**
 * P6.7-A — Accès missions (pur, testable) : seul APPROVED opère.
 * Miroir du gate ExpertScreen ; l'autorité reste expert_documents + RLS/RPC.
 */
export function canAccessExpertMissions(
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null | undefined
): boolean {
  return status === 'APPROVED';
}

export async function loadDynamicChecklist(serviceId?: string): Promise<{
  sections: (InspectionSection & { items: InspectionItem[] })[];
}> {
  const supabase = getSupabaseClient();

  let templateQuery = supabase
    .from('inspection_templates')
    .select('id')
    .eq('is_active', true);
  
  if (serviceId) {
    templateQuery = templateQuery.eq('service_id', serviceId);
  }

  const { data: templates, error: tmplError } = await templateQuery.limit(1);
  if (tmplError || !templates || templates.length === 0) {
    throw new ServiceError(
      'NOT_FOUND',
      serviceId
        ? `Checklist indisponible : aucun modèle d'inspection actif pour le service '${serviceId}'.`
        : "Aucun modèle d'inspection trouvé."
    );
  }

  const templateId = templates[0].id;

  const { data: sections, error: secError } = await supabase
    .from('inspection_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index', { ascending: true });

  if (secError) throw secError;

  const sectionIds = (sections || []).map(s => s.id);
  const { data: items, error: itError } = await supabase
    .from('inspection_items')
    .select('*')
    .in('section_id', sectionIds)
    .order('order_index', { ascending: true });

  if (itError) throw itError;

  const sectionsWithItems = (sections || []).map(sec => ({
    ...sec,
    items: (items || []).filter(it => it.section_id === sec.id) as InspectionItem[]
  }));

  return { sections: sectionsWithItems };
}

export async function startInspection(bookingId: string, expertId?: string) {
  const supabase = getSupabaseClient();

  // P4 — expert dérivé de la session, jamais d'un paramètre arbitraire.
  const sessionUserId = await requireSessionUserId();
  if (expertId && expertId !== sessionUserId) {
    throw new ServiceError(
      'OWNER_MISMATCH',
      "Démarrage refusé : l'expert ne correspond pas à la session."
    );
  }

  // P4 — le booking doit être assigné à cet expert (invisible sinon via RLS).
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, expert_id, status, service_id')
    .eq('id', bookingId)
    .single();
  if (bookingError || !booking || booking.expert_id !== sessionUserId) {
    throw new ServiceError(
      'FORBIDDEN',
      "Démarrage refusé : cette mission ne vous est pas assignée."
    );
  }
  if (booking.status !== 'SCHEDULED') {
    throw new ServiceError(
      'BUSINESS',
      `Démarrage refusé : statut actuel '${booking.status}', SCHEDULED requis.`
    );
  }

  // P8.07 — Vérification préalable qu'un modèle d'inspection actif existe pour ce service
  // Empêche le démarrage d'une inspection avec une checklist vide ou inadaptée.
  if (booking.service_id) {
    const { data: tmpl, error: tmplErr } = await supabase
      .from('inspection_templates')
      .select('id')
      .eq('service_id', booking.service_id)
      .eq('is_active', true)
      .limit(1);

    if (tmplErr || !tmpl || tmpl.length === 0) {
      throw new ServiceError(
        'BUSINESS',
        `Démarrage refusé : aucun modèle d'inspection actif n'est associé au service de cette mission.`
      );
    }
  }

  // P4 — expert APPROVED exigé (contrôle applicatif ; la RPC contrôle aussi).
  const { data: doc, error: docError } = await supabase
    .from('expert_documents')
    .select('verification_status')
    .eq('expert_id', sessionUserId)
    .maybeSingle();
  if (docError) throw docError;
  assertExpertOperable(deriveExpertStatus(doc as any));
  const { data: session, error: sessError } = await supabase
    .from('inspection_sessions')
    .insert({
      booking_id: bookingId,
      expert_id: sessionUserId,
      status: 'IN_PROGRESS'
    })
    .select()
    .single();

  if (sessError) throw sessError;

  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: bookingId,
    p_target_status: 'IN_PROGRESS'
  });

  return session;
}

/**
 * P4 — Acceptation d'une mission par l'expert connecté via transition_booking_rpc.
 * Vérifie : session, assignation, statut BOOKING_REQUESTED, APPROVED.
 * Ne modifie jamais booking.status directement.
 */
export async function acceptBooking(bookingId: string) {
  const supabase = getSupabaseClient();
  const sessionUserId = await requireSessionUserId();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, expert_id, status')
    .eq('id', bookingId)
    .single();
  if (bookingError || !booking || booking.expert_id !== sessionUserId) {
    throw new ServiceError(
      'FORBIDDEN',
      'Acceptation refusée : cette mission ne vous est pas assignée.'
    );
  }
  if (booking.status !== 'BOOKING_REQUESTED') {
    throw new ServiceError(
      'BUSINESS',
      `Acceptation refusée : statut actuel '${booking.status}', BOOKING_REQUESTED requis.`
    );
  }

  const { data: doc, error: docError } = await supabase
    .from('expert_documents')
    .select('verification_status')
    .eq('expert_id', sessionUserId)
    .maybeSingle();
  if (docError) throw docError;
  assertExpertOperable(deriveExpertStatus(doc as any));

  const { data, error } = await supabase.rpc('transition_booking_rpc', {
    p_booking_id: bookingId,
    p_target_status: 'ACCEPTED'
  });

  if (error) throw error;
  return data;
}

export async function saveInspectionAnswers(
  sessionId: string,
  answers: { item_id: string; status: ItemStatus; severity?: SeverityLevel; comment?: string }[]
) {
  const supabase = getSupabaseClient();
  const rows = answers.map(a => ({
    session_id: sessionId,
    item_id: a.item_id,
    status: a.status,
    severity: a.severity || null,
    comment: a.comment || null
  }));

  const { data, error } = await supabase
    .from('inspection_answers')
    .upsert(rows, { onConflict: 'session_id,item_id' });

  if (error) throw error;
  return data;
}

export async function finalizeAndPublishReport(params: {
  bookingId: string;
  sessionId: string;
  expertId: string;
  summary: string;
  answersWithItems: AnswerWithItem[];
  pdfUrl?: string;
  categoryCode?: string;
}) {
  const supabase = getSupabaseClient();

  const requiredItems = params.answersWithItems.map(a => a.item);
  const check = validateRequiredItemsCompleted(
    requiredItems, 
    params.answersWithItems.map(a => ({ item_id: a.item.id, status: a.status }))
  );
  if (!check.isValid) {
    throw new Error('Impossible de finaliser : ' + check.missingItems.length + ' point(s) obligatoire(s) non renseigne(s).');
  }

  // P8.07 - Résolution robuste du categoryCode pour garantir le disclaimer approprié
  let categoryCode = params.categoryCode;
  if (!categoryCode) {
    try {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('listings(category_id, categories(code), listing_real_estate(domain))')
        .eq('id', params.bookingId)
        .maybeSingle();
      const listing: any = bookingData?.listings;
      categoryCode =
        listing?.categories?.code ||
        (Array.isArray(listing?.listing_real_estate)
          ? listing?.listing_real_estate[0]?.domain?.toLowerCase()
          : listing?.listing_real_estate?.domain?.toLowerCase());
    } catch (catErr) {
      console.warn('[finalizeAndPublishReport] Impossible de résoudre le categoryCode :', catErr);
    }
  }

  const scoreResult = calculateInspectionScore(params.answersWithItems, categoryCode);

  const { data: report, error: repError } = await supabase
    .from('reports')
    .upsert({
      booking_id: params.bookingId,
      session_id: params.sessionId,
      score: scoreResult.score,
      summary: params.summary,
      positive_points: scoreResult.positive_points,
      watchpoints: scoreResult.watchpoints,
      major_defects: scoreResult.major_defects,
      critical_defects: scoreResult.critical_defects,
      disclaimer: scoreResult.disclaimer,
      pdf_url: params.pdfUrl || null,
      is_published: true,
      published_at: new Date().toISOString()
    }, { onConflict: 'booking_id' })
    .select()
    .single();

  if (repError) throw repError;

  await supabase
    .from('inspection_sessions')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', params.sessionId);

  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: params.bookingId,
    p_target_status: 'INSPECTION_COMPLETED'
  });
  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: params.bookingId,
    p_target_status: 'REPORT_PENDING'
  });
  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: params.bookingId,
    p_target_status: 'REPORT_READY'
  });

  return report;
}
