import { getSupabaseClient } from '../client.js';
import { requireSessionUserId } from './buyer.js';
import { ServiceError } from './ownership.js';

/**
 * P6.3 — Miroir UI/read-only de la machine serveur (transition_booking_rpc).
 *
 * ATTENTION : ceci n'est JAMAIS une sécurité. L'autorité exclusive reste la
 * RPC serveur, qui re-valide acteur + transition + RLS à chaque appel.
 * Ce miroir sert uniquement à afficher les bons boutons au bon moment.
 */
export const BOOKING_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['BOOKING_REQUESTED'],
  BOOKING_REQUESTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SCHEDULED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'DISPUTED'],
  IN_PROGRESS: ['INSPECTION_COMPLETED', 'DISPUTED'],
  INSPECTION_COMPLETED: ['REPORT_PENDING', 'DISPUTED'],
  REPORT_PENDING: ['REPORT_READY', 'DISPUTED'],
  REPORT_READY: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  EXPIRED: [],
};

/** Statuts depuis lesquels CANCELLED est atteignable (miroir serveur). */
export const CANCELLABLE_STATUSES = ['ACCEPTED', 'PAYMENT_PENDING', 'SCHEDULED', 'DISPUTED'] as const;

/**
 * P6.4-C — Statuts contestables par rôle (décision métier MVP, miroir de la
 * RPC ; le serveur tranche dans tous les cas). COMPLETED exclu : aucun
 * litige post-COMPLETED, aucun remboursement dans cette phase.
 */
export const BUYER_DISPUTABLE_STATUSES = [
  'IN_PROGRESS',
  'INSPECTION_COMPLETED',
  'REPORT_PENDING',
  'REPORT_READY'
] as const;

export const EXPERT_DISPUTABLE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'REPORT_READY'] as const;

export const DISPUTE_REASON_MIN_LENGTH = 5;

/**
 * P6.4-C — Motif de litige (pur, testable) : ≥ 5 caractères après trim,
 * même principe que le rejet expert. Aucune colonne ajoutée (p_notes).
 */
export function validateDisputeReason(reason: string | null | undefined): string {
  const trimmed = (reason || '').trim();
  if (trimmed.length < DISPUTE_REASON_MIN_LENGTH) {
    throw new ServiceError(
      'VALIDATION',
      'Un motif d’au moins 5 caractères est obligatoire pour ouvrir un litige.'
    );
  }
  return trimmed;
}

/**
 * P6.4-C — Éligibilité litige (pure, testable) : rôle déduit de la réservation
 * (buyer vs expert assigné), ensemble contestable du rôle, jamais COMPLETED
 * ni aucun autre statut hors ensembles. Le serveur re-valide l'intégralité.
 */
export function resolveDisputeEligibility(
  booking: { buyer_id: string; expert_id: string | null; status: string } | null,
  callerId: string | null
): 'BUYER' | 'EXPERT' {
  if (!callerId) {
    throw new ServiceError('AUTH', 'Session requise pour ouvrir un litige.');
  }
  if (!booking) {
    throw new ServiceError('NOT_FOUND', 'Réservation introuvable.');
  }
  if (booking.buyer_id === callerId) {
    if (!(BUYER_DISPUTABLE_STATUSES as readonly string[]).includes(booking.status)) {
      throw new ServiceError(
        'BUSINESS',
        `Litige refusé : statut actuel '${booking.status}' non contestable par l’acheteur.`
      );
    }
    return 'BUYER';
  }
  if (booking.expert_id && booking.expert_id === callerId) {
    if (!(EXPERT_DISPUTABLE_STATUSES as readonly string[]).includes(booking.status)) {
      throw new ServiceError(
        'BUSINESS',
        `Litige refusé : statut actuel '${booking.status}' non contestable par l’expert.`
      );
    }
    return 'EXPERT';
  }
  throw new ServiceError('FORBIDDEN', 'Litige réservé aux parties de la réservation.');
}

/**
 * P6.3 — Gating UI pur : la transition est-elle prévue par la machine ?
 * Le serveur tranche dans tous les cas via transition_booking_rpc.
 */
export function canTransitionLocal(fromStatus: string, toStatus: string): boolean {
  const allowed = BOOKING_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(toStatus);
}

export interface BookingParty {
  id: string;
  buyer_id: string;
  expert_id: string | null;
  status: string;
}

/**
 * P6.3 — Éligibilité annulation (pure, testable) : statut compatible
 * uniquement. La participation est vérifiée par la lecture (RLS) puis par
 * la RPC ; un tiers ne peut ni lire ni faire transiter le booking.
 */
export function assertCancellableStatus(status: string): void {
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(status)) {
    throw new ServiceError(
      'BUSINESS',
      `Annulation refusée : statut actuel '${status}' non annulable.`
    );
  }
}

/**
 * P6.3 — Éligibilité refus (pure, testable) : BOOKING_REQUESTED + appelant
 * égal à l'expert assigné. Règle d'UI : côté serveur, toute partie pourrait
 * rejeter ; le parcours MVP réserve le refus à l'expert assigné et ne
 * propose jamais ce bouton au buyer.
 */
export function resolveRejectEligibility(
  booking: { expert_id: string | null; status: string } | null,
  callerId: string | null
): void {
  if (!callerId) {
    throw new ServiceError('AUTH', 'Session requise pour refuser une mission.');
  }
  if (!booking) {
    throw new ServiceError('NOT_FOUND', 'Réservation introuvable.');
  }
  if (booking.status !== 'BOOKING_REQUESTED') {
    throw new ServiceError(
      'BUSINESS',
      `Refus refusé : statut actuel '${booking.status}', BOOKING_REQUESTED requis.`
    );
  }
  if (!booking.expert_id || booking.expert_id !== callerId) {
    throw new ServiceError('FORBIDDEN', 'Refus réservé à l’expert assigné à la mission.');
  }
}

/**
 * P6.4-A — Durée MVP d'expiration (décision technique documentée) : 72 h après
 * created_at. Miroir du défaut SQL de expire_stale_booking_requests.
 */
export const BOOKING_EXPIRY_MAX_AGE_HOURS = 72;

export interface BookingExpiryInfo {
  expiresAt: string;
  expired: boolean;
}

/**
 * P6.4-A — Règle d'expiration (pure, testable) : seuls les BOOKING_REQUESTED
 * plus anciens que maxAgeHeures expirent. Aucun autre statut n'est touché,
 * jamais (ACCEPTED, PAYMENT_PENDING, SCHEDULED, CANCELLED, REJECTED,
 * EXPIRED, ... restent intacts même périmés).
 */
export function shouldExpireBooking(
  booking: { status: string; created_at: string } | null | undefined,
  nowMs: number = Date.now(),
  maxAgeHours: number = BOOKING_EXPIRY_MAX_AGE_HOURS
): boolean {
  if (!booking || booking.status !== 'BOOKING_REQUESTED') return false;
  const created = new Date(booking.created_at).getTime();
  if (!Number.isFinite(created)) return false;
  return nowMs - created > maxAgeHours * 3600 * 1000;
}

/**
 * P6.4-A — Info d'affichage (pure, testable) : date d'expiration théorique
 * d'une demande, pour l'UI. Indicative uniquement : seule la fonction
 * serveur expire_stale_booking_requests fait foi.
 */
export function getExpiryInfo(
  createdAtIso: string,
  maxAgeHours: number = BOOKING_EXPIRY_MAX_AGE_HOURS
): BookingExpiryInfo {
  const created = new Date(createdAtIso).getTime();
  const safeCreated = Number.isFinite(created) ? created : Date.now();
  return {
    expiresAt: new Date(safeCreated + maxAgeHours * 3600 * 1000).toISOString(),
    expired: shouldExpireBooking({ status: 'BOOKING_REQUESTED', created_at: createdAtIso }, Date.now(), maxAgeHours),
  };
}

/**
 * P6.3 — Transition métier unique : appelle transition_booking_rpc, seule
 * autorité. Aucun UPDATE direct de bookings.status depuis le client.
 */
export async function transitionBooking(
  bookingId: string,
  targetStatus: string,
  notes?: string | null
): Promise<unknown> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  if (!bookingId) {
    throw new ServiceError('VALIDATION', 'Réservation requise.');
  }
  const { data, error } = await supabase.rpc('transition_booking_rpc', {
    p_booking_id: bookingId,
    p_target_status: targetStatus,
    p_notes: notes ?? null
  });

  if (error) throw error;
  return data;
}

async function readOwnBooking(bookingId: string): Promise<BookingParty> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, buyer_id, expert_id, status')
    .eq('id', bookingId)
    .single();
  if (error || !data) {
    throw new ServiceError(
      'FORBIDDEN',
      'Accès refusé : cette réservation ne vous est pas accessible.'
    );
  }
  return data as BookingParty;
}

/**
 * P6.3 — Annulation : pré-contrôle du statut (lisible uniquement si partie
 * prenante via RLS), puis RPC qui tranche définitivement.
 */
export async function cancelBooking(bookingId: string, notes?: string | null): Promise<unknown> {
  const booking = await readOwnBooking(bookingId);
  assertCancellableStatus(booking.status);
  return transitionBooking(bookingId, 'CANCELLED', notes);
}

/**
 * P6.3 — Refus expert : BOOKING_REQUESTED → REJECTED via p_notes (motif
 * optionnel, aucune colonne ajoutée). L'appelant doit être l'expert assigné.
 */
export async function rejectBooking(bookingId: string, reason?: string | null): Promise<unknown> {
  const sessionUserId = await requireSessionUserId();
  const booking = await readOwnBooking(bookingId);
  resolveRejectEligibility(
    { expert_id: booking.expert_id, status: booking.status },
    sessionUserId
  );
  return transitionBooking(bookingId, 'REJECTED', reason?.trim() ? reason.trim() : null);
}

/**
 * P6.4-C — Ouverture de litige : statut source selon le rôle (buyer vs expert
 * assigné) + motif obligatoire, puis transition_booking_rpc('DISPUTED').
 * Le serveur tranche définitivement (rôle, statut, motif, RLS).
 */
export async function openDispute(bookingId: string, reason: string | null | undefined): Promise<unknown> {
  const sessionUserId = await requireSessionUserId();
  const booking = await readOwnBooking(bookingId);
  resolveDisputeEligibility(
    { buyer_id: booking.buyer_id, expert_id: booking.expert_id, status: booking.status },
    sessionUserId
  );
  return transitionBooking(bookingId, 'DISPUTED', validateDisputeReason(reason));
}
