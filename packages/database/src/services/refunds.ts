import { getSupabaseClient } from '../client.js';
import { requireSessionUserId } from './buyer.js';
import { ServiceError } from './ownership.js';

export interface Refund {
  id: string;
  booking_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'DUE' | 'EXECUTED';
  created_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface FinancialState {
  /** Commission plateforme exigible : 15 % validés uniquement à COMPLETED. */
  commissionDue: number;
  /** Part expert exigible : 85 % dus uniquement à COMPLETED. */
  payoutDue: number;
  payoutState: 'DUE' | 'NOT_DUE';
  /**
   * Remboursement exigible (droit constaté, sandbox) : intégralité du montant
   * payé si la réservation est annulée après paiement. Comptable uniquement :
   * aucun transfert réel n'existe dans ce MVP.
   */
  refundEntitlement: number;
}

/**
 * P6.5-B — État financier dérivé (pur, testable) : jamais d'écrasement des
 * valeurs historiques (price_total/commission/payout restent intacts en base),
 * l'exigibilité se déduit du statut. Avant COMPLETED : commission 0 exigible,
 * payout non dû. Annulée après paiement : remboursement intégral dû.
 */
export function resolveFinancialState(booking: {
  status: string;
  price_total: number;
  commission_platform: number;
  expert_payout: number;
}): FinancialState {
  const completed = booking.status === 'COMPLETED';
  const cancelledAfterPayment = booking.status === 'CANCELLED' && booking.price_total > 0;
  return {
    commissionDue: completed ? booking.commission_platform : 0,
    payoutDue: completed ? booking.expert_payout : 0,
    payoutState: completed ? 'DUE' : 'NOT_DUE',
    refundEntitlement: cancelledAfterPayment ? booking.price_total : 0,
  };
}

export interface RefundEligibility {
  bookingStatus: string;
  hasPaidPayment: boolean;
  hasRefund: boolean;
  isAdmin: boolean;
}

/**
 * P6.5-B — Éligibilité marquage « dû » (pure, testable, miroir de la RPC) :
 * admin + booking CANCELLED + paiement PAID + aucun marquage existant.
 * COMPLETED, buyer, expert : refusés.
 */
export function resolveRefundEligibility(ctx: RefundEligibility): void {
  if (!ctx.isAdmin) {
    throw new ServiceError('FORBIDDEN', 'Marquage réservé à l’administrateur.');
  }
  if (ctx.bookingStatus !== 'CANCELLED') {
    throw new ServiceError(
      'BUSINESS',
      `Remboursement refusé : réservation non annulée (statut ${ctx.bookingStatus}).`
    );
  }
  if (!ctx.hasPaidPayment) {
    throw new ServiceError('BUSINESS', 'Remboursement refusé : aucun paiement effectué.');
  }
  if (ctx.hasRefund) {
    throw new ServiceError('BUSINESS', 'Remboursement déjà enregistré pour cette réservation.');
  }
}

/**
 * P6.5-B — Marquage « remboursement dû » via RPC admin-only. Montant dérivé
 * du paiement côté serveur ; idempotent (UNIQUE + pré-contrôle) ; tracé
 * admin_actions ; notifié « dû », jamais « effectué ».
 */
export async function markRefundDue(bookingId: string, reason?: string | null): Promise<unknown> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  if (!bookingId) {
    throw new ServiceError('VALIDATION', 'Réservation requise.');
  }
  const { data, error } = await supabase.rpc('mark_refund_due_rpc', {
    p_booking_id: bookingId,
    p_reason: reason?.trim() ? reason.trim() : null
  });
  if (error) throw error;
  return data;
}

/**
 * P6.5-B — Marquage existant d'un booking (RLS : parties + admin).
 */
export async function getBookingRefund(bookingId: string): Promise<Refund | null> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const { data, error } = await supabase
    .from('refunds')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data as Refund | null;
}
