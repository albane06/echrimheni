/**
 * P3 — Gardes pures d'autorisation et classification d'erreurs (aucun accès réseau).
 *
 * Ces helpers garantissent que le client ne fait jamais confiance à un
 * identifiant fourni par l'écran : seul l'id de la session Auth est autoritatif.
 */

export type ServiceErrorKind =
  | 'AUTH'
  | 'OWNER_MISMATCH'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'BUSINESS'
  | 'NETWORK'
  | 'UNKNOWN';

export class ServiceError extends Error {
  readonly kind: ServiceErrorKind;
  constructor(kind: ServiceErrorKind, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.kind = kind;
  }
}

/**
 * Refuse tout ownerId différent de l'utilisateur de la session.
 * Lève OWNER_MISMATCH (jamais de fallback silencieux).
 */
export function assertOwner(
  sessionUserId: string | null | undefined,
  ownerId: string | null | undefined,
  entity = 'ressource'
): void {
  if (!sessionUserId) {
    throw new ServiceError('AUTH', `Session requise pour accéder à ${entity}.`);
  }
  if (!ownerId || ownerId !== sessionUserId) {
    throw new ServiceError(
      'OWNER_MISMATCH',
      `Accès refusé à ${entity} : l'identifiant ne correspond pas à la session.`
    );
  }
}

/**
 * Résout l'id auteur d'une écriture : dérive de la session,
 * refuse toute valeur divergente fournie par l'écran.
 */
export function resolveAuthorId(
  sessionUserId: string | null | undefined,
  requestedId?: string | null,
  entity = 'ressource'
): string {
  if (!sessionUserId) {
    throw new ServiceError('AUTH', `Session requise pour écrire ${entity}.`);
  }
  if (requestedId && requestedId !== sessionUserId) {
    throw new ServiceError(
      'OWNER_MISMATCH',
      `Écriture refusée sur ${entity} : identifiant non issu de la session.`
    );
  }
  return sessionUserId;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Classifie une erreur Supabase/réseau sans jamais la masquer :
 * AUTH (401/session), FORBIDDEN/RLS (403, 42501), NOT_FOUND (404, PGRST116),
 * VALIDATION (400 générique, contraintes 22xxx/235xx), BUSINESS (P0001 levée
 * par les RPC métier : transition illégale, paiement refusé...),
 * NETWORK (fetch/timeout), UNKNOWN sinon.
 */
export function classifySupabaseError(err: unknown): ServiceErrorKind {
  const raw = messageOf(err);
  const lower = raw.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('timeout') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return 'NETWORK';
  }
  if (
    lower.includes('p0001') ||
    lower.includes('transition illégale') ||
    lower.includes('transition illegale') ||
    lower.includes('non autorisé') ||
    lower.includes('non autorise') ||
    lower.includes('réservée à') ||
    lower.includes('reservee a') ||
    lower.includes('action refusée') ||
    lower.includes('montant invalide') ||
    lower.includes('déjà enregistré')
  ) {
    return 'BUSINESS';
  }
  if (
    lower.includes('42501') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized') ||
    lower.includes('rls') ||
    lower.includes('row-level security') ||
    lower.includes('policy')
  ) {
    return 'FORBIDDEN';
  }
  if (
    lower.includes('pgrst116') ||
    lower.includes('no rows') ||
    lower.includes('introuvable') ||
    lower.includes('not found')
  ) {
    return 'NOT_FOUND';
  }
  if (
    lower.includes('invalid') ||
    lower.includes('22p02') ||
    lower.includes('23502') ||
    lower.includes('23505') ||
    lower.includes('23514') ||
    lower.includes('23503') ||
    lower.includes('violates') ||
    lower.includes('check constraint')
  ) {
    return 'VALIDATION';
  }
  if (
    lower.includes('401') ||
    lower.includes('jwt') ||
    lower.includes('session') ||
    lower.includes('expired') ||
    lower.includes('signed out') ||
    lower.includes('user not found')
  ) {
    return 'AUTH';
  }
  return 'UNKNOWN';
}

/**
 * P6.3 — Validation date/heure souhaitée (pure, testable) : ISO valide et
 * strictement future. Le serveur ne contraint pas scheduled_at dans ce MVP
 * (colonne libre) : cette garde client évite les valeurs absurdes, sans
 * prétendre être une règle serveur.
 */
export function validateScheduledAt(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    throw new ServiceError('VALIDATION', 'Date et heure souhaitées requises.');
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new ServiceError('VALIDATION', 'Date/heure invalide (ISO attendue).');
  }
  if (date.getTime() <= Date.now()) {
    throw new ServiceError('VALIDATION', 'La date souhaitée doit être dans le futur.');
  }
  return date.toISOString();
}

/**
 * P6.3 — Cohérence service/listing (pure, testable) : le service doit
 * appartenir à la catégorie de l'annonce. Le prix reste lu depuis
 * services.base_price côté service de création.
 */
export function assertServiceMatchesListing(
  service: { id: string; category_id: string } | null | undefined,
  listingCategoryId: string | null | undefined
): void {
  if (!service || !listingCategoryId) {
    throw new ServiceError('VALIDATION', 'Service et annonce requis.');
  }
  if (service.category_id !== listingCategoryId) {
    throw new ServiceError(
      'VALIDATION',
      'Service incompatible avec la catégorie de cette annonce.'
    );
  }
}
