/**
 * P7.7 — Helpers purs du parcours paiement (présentation uniquement).
 * Autorité réelle : `validatePaymentEligibility` + `process_payment_rpc`
 * côté serveur. Ici : mapping CTA, messages d'erreur conviviaux, affichage.
 */

export type PaymentCta = 'pay' | 'track' | 'report' | null;

/** CTA contextuel par statut (spec §9). */
export function paymentCtaForStatus(status: string | null | undefined): PaymentCta {
  if (!status) return null;
  if (status === 'ACCEPTED' || status === 'PAYMENT_PENDING') return 'pay';
  if (status === 'PAID' || status === 'SCHEDULED' || status === 'IN_PROGRESS') return 'track';
  if (status === 'REPORT_READY' || status === 'COMPLETED') return 'report';
  return null;
}

/** Le CTA paiement ne s'affiche que sur ces statuts (miroir serveur). */
export function isPayableStatus(status: string | null | undefined): boolean {
  return status === 'ACCEPTED' || status === 'PAYMENT_PENDING';
}

export type PaymentFailureKind =
  | 'NETWORK'
  | 'ALREADY_PAID'
  | 'NOT_ELIGIBLE'
  | 'NOT_FOUND'
  | 'SESSION'
  | 'UNKNOWN';

/**
 * Message FR sûr pour l'utilisateur. Ne laisse jamais fuir de SQL/PostgREST
 * brut : seuls les messages métier connus sont repris, sinon générique.
 */
export function friendlyPaymentError(raw: unknown): { kind: PaymentFailureKind; message: string } {
  const message = raw instanceof Error ? raw.message : String(raw ?? '');
  const lower = message.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('networkerror') ||
    lower.includes('timeout') ||
    lower.includes('aborted')
  ) {
    return { kind: 'NETWORK', message: 'Connexion impossible. Vérifiez votre réseau puis réessayez.' };
  }
  if (lower.includes('déjà') || lower.includes('already') || lower.includes('idempotent')) {
    return { kind: 'ALREADY_PAID', message: 'Ce paiement a déjà été enregistré.' };
  }
  if (lower.includes('éligible') || lower.includes('statut') || lower.includes('annul')) {
    return { kind: 'NOT_ELIGIBLE', message: 'Cette demande ne peut plus être payée dans son état actuel.' };
  }
  if (lower.includes('introuvable') || lower.includes('not_found') || lower.includes('not found')) {
    return { kind: 'NOT_FOUND', message: 'Demande introuvable.' };
  }
  if (lower.includes('session') || lower.includes('auth') || lower.includes('connect')) {
    return { kind: 'SESSION', message: 'Session expirée. Reconnectez-vous puis réessayez.' };
  }
  return { kind: 'UNKNOWN', message: "Le paiement n'a pas pu être confirmé." };
}

/** Affichage uniquement : part plateforme 15 % / expert 85 % (serveur = autorité). */
export function displaySplit(total: number): { commission: number; payout: number } {
  const commission = Math.round(total * 0.15);
  return { commission, payout: total - commission };
}
