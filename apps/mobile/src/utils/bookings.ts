/**
 * P7.4 — Prédicats métier d'affichage (lecture seule, aucune règle modifiée).
 * Miroirs des constantes des services : toute évolution serveur doit être
 * répercutée ici manuellement et signalée.
 */
import type { TimelineStepState } from '../components/ui/Progress';

/** Statuts terminaux : plus aucune action buyer attendue (spec §9). */
export const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'] as const;

/** Statuts dont un rapport publié peut exister (spec §11). */
export const REPORTABLE_STATUSES = ['REPORT_READY', 'COMPLETED'] as const;

export function isTerminalStatus(status: string | null | undefined): boolean {
  return !!status && (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isReportableStatus(status: string | null | undefined): boolean {
  return !!status && (REPORTABLE_STATUSES as readonly string[]).includes(status);
}

export function splitBookings<T extends { status: string }>(rows: T[]): { active: T[]; done: T[] } {
  return {
    active: rows.filter((b) => !isTerminalStatus(b.status)),
    done: rows.filter((b) => isTerminalStatus(b.status)),
  };
}

const TUNNEL_LABELS = [
  'Demande envoyée',
  'Confirmée',
  'Expert assigné',
  'En inspection',
  'Rapport disponible',
];

/** Position dans le tunnel nominal ; -1 = statut hors tunnel. */
export function tunnelIndex(status: string | null | undefined): number {
  if (!status) return -1;
  if (status === 'BOOKING_REQUESTED') return 0;
  if (['ACCEPTED', 'PAYMENT_PENDING', 'PAID'].includes(status)) return 1;
  if (status === 'SCHEDULED') return 2;
  if (['IN_PROGRESS', 'INSPECTION_COMPLETED', 'REPORT_PENDING'].includes(status)) return 3;
  if (['REPORT_READY', 'COMPLETED'].includes(status)) return 4;
  return -1;
}

export function tunnelSteps(status: string | null | undefined): { label: string; state: TimelineStepState }[] {
  const idx = tunnelIndex(status);
  if (idx < 0) return [];
  return TUNNEL_LABELS.map((label, i) => ({
    label,
    state: (i < idx ? 'done' : i === idx ? 'current' : 'todo') as TimelineStepState,
  }));
}
