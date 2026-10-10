/**
 * P7.8/P7.10 — Suivi de mission (présentation uniquement). Dérive strictement
 * du statut serveur ; aucun état inventé, aucune transition modifiée.
 * Libellés traduits via `lang` (défaut FR pour non-régression) ; les clés
 * techniques restent inchangées.
 */
import type { TimelineStepState } from '../components/ui/Progress';
import type { FormatLang } from '../theme/format';
import { ar } from '../i18n/locales/ar';
import { en } from '../i18n/locales/en';
import { fr, type FrDict } from '../i18n/locales/fr';

type TrackingStrings = FrDict['tracking'];
const TRACK: Record<FormatLang, TrackingStrings> = { fr: fr.tracking, ar: ar.tracking, en: en.tracking };

const LOCALES: Record<FormatLang, string> = { fr: 'fr-DZ', ar: 'ar-DZ', en: 'en-US' };

export type TrackStepKey =
  | 'requested'
  | 'accepted'
  | 'paid'
  | 'scheduled'
  | 'in_progress'
  | 'inspected'
  | 'report'
  | 'completed';

export interface TrackStep {
  key: TrackStepKey;
  label: string;
  state: TimelineStepState;
  /** Date réelle si disponible pour cette étape, sinon null (jamais inventée). */
  date: string | null;
}

export interface Tracking {
  steps: TrackStep[];
  /** Titre de la situation actuelle. */
  headline: string;
  /** Explication honnête de ce qui vient / ce qu'il faut faire. */
  subline: string | null;
  currentIndex: number;
}

export type TerminalKind = 'CANCELLED' | 'REJECTED' | 'EXPIRED' | 'DISPUTED';

export function isTerminalKind(status: string | null | undefined): status is TerminalKind {
  return status === 'CANCELLED' || status === 'REJECTED' || status === 'EXPIRED' || status === 'DISPUTED';
}

export function terminalMessage(kind: TerminalKind, lang: FormatLang = 'fr'): { title: string; message: string } {
  const s = TRACK[lang];
  switch (kind) {
    case 'CANCELLED':
      return { title: s.terminalCancelledT, message: s.terminalCancelledM };
    case 'REJECTED':
      return { title: s.terminalRejectedT, message: s.terminalRejectedM };
    case 'EXPIRED':
      return { title: s.terminalExpiredT, message: s.terminalExpiredM };
    case 'DISPUTED':
      return { title: s.terminalDisputedT, message: s.terminalDisputedM };
  }
}

const STEP_KEYS: TrackStepKey[] = [
  'requested',
  'accepted',
  'paid',
  'scheduled',
  'in_progress',
  'inspected',
  'report',
  'completed',
];

/** Rang atteint dans le tunnel nominal ; -1 = hors tunnel. */
function rankOf(status: string): number {
  switch (status) {
    case 'BOOKING_REQUESTED':
      return 0;
    case 'ACCEPTED':
    case 'PAYMENT_PENDING':
      return 1;
    case 'PAID':
      return 2;
    case 'SCHEDULED':
      return 3;
    case 'IN_PROGRESS':
      return 4;
    case 'INSPECTION_COMPLETED':
    case 'REPORT_PENDING':
      return 5;
    case 'REPORT_READY':
      return 6;
    case 'COMPLETED':
      return 7;
    default:
      return -1;
  }
}

function stepLabel(key: TrackStepKey, lang: FormatLang): string {
  const s = TRACK[lang];
  switch (key) {
    case 'requested':
      return s.requested;
    case 'accepted':
      return s.accepted;
    case 'paid':
      return s.paid;
    case 'scheduled':
      return s.scheduled;
    case 'in_progress':
      return s.inProgress;
    case 'inspected':
      return s.inspected;
    case 'report':
      return s.report;
    case 'completed':
      return s.completed;
  }
}

function headlineFor(status: string, lang: FormatLang): string {
  const s = TRACK[lang];
  switch (status) {
    case 'BOOKING_REQUESTED':
      return s.requested;
    case 'ACCEPTED':
    case 'PAYMENT_PENDING':
      return s.accepted;
    case 'PAID':
      return s.paid;
    case 'SCHEDULED':
      return s.scheduled;
    case 'IN_PROGRESS':
      return s.inProgress;
    case 'INSPECTION_COMPLETED':
    case 'REPORT_PENDING':
      return s.inspected;
    case 'REPORT_READY':
      return s.report;
    case 'COMPLETED':
      return s.completed;
    default:
      return status;
  }
}

/**
 * Construit le suivi à partir du statut + dates réelles.
 * `createdAt` alimente l'étape 1, `scheduledAt` l'étape 4 ; le reste sans date.
 */
export function trackingForStatus(
  status: string | null | undefined,
  dates: { createdAt?: string | null; scheduledAt?: string | null },
  lang: FormatLang = 'fr',
): Tracking | null {
  if (!status || isTerminalKind(status)) return null;
  const rank = rankOf(status);
  if (rank < 0) return null;
  const steps: TrackStep[] = STEP_KEYS.map((key, i) => ({
    key,
    label: stepLabel(key, lang),
    state: (i < rank ? 'done' : i === rank ? 'current' : 'todo') as TimelineStepState,
    date:
      key === 'requested'
        ? dates.createdAt
          ? formatStepDate(dates.createdAt, lang)
          : null
        : key === 'scheduled'
          ? dates.scheduledAt
            ? formatStepDate(dates.scheduledAt, lang)
            : null
          : null,
  }));
  return {
    steps,
    headline: headlineFor(status, lang),
    subline: sublineFor(status, lang),
    currentIndex: rank,
  };
}

function sublineFor(status: string, lang: FormatLang): string | null {
  const s = TRACK[lang];
  switch (status) {
    case 'BOOKING_REQUESTED':
      return s.requestedSub ?? null;
    default:
      return statusSublineFallback(status, s);
  }
}

function statusSublineFallback(status: string, s: TrackingStrings): string | null {
  switch (status) {
    case 'ACCEPTED':
      return s.acceptedSub;
    case 'PAYMENT_PENDING':
      return s.pendingSub;
    case 'PAID':
      return s.paidSub;
    case 'IN_PROGRESS':
      return s.progressSub;
    case 'INSPECTION_COMPLETED':
      return s.inspectedSub;
    case 'REPORT_PENDING':
      return s.reportPendingSub;
    case 'REPORT_READY':
      return s.reportSub;
    case 'COMPLETED':
      return s.completedSub;
    default:
      return null;
  }
}

function formatStepDate(iso: string, lang: FormatLang): string | null {
  try {
    return new Date(iso).toLocaleDateString(LOCALES[lang], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

/** Mention de prochaine action sur les cartes liste. */
export function nextActionHint(status: string | null | undefined, lang: FormatLang = 'fr'): string | null {
  const s = TRACK[lang];
  switch (status) {
    case 'ACCEPTED':
    case 'PAYMENT_PENDING':
      return s.hintPayment;
    case 'PAID':
      return s.hintPlanning;
    case 'SCHEDULED':
      return s.hintScheduled;
    case 'IN_PROGRESS':
      return s.hintProgress;
    case 'REPORT_READY':
      return s.hintReport;
    case 'COMPLETED':
      return s.hintDone;
    case 'CANCELLED':
    case 'REJECTED':
      return s.hintCancelled;
    case 'EXPIRED':
      return s.hintExpired;
    case 'DISPUTED':
      return s.hintDispute;
    default:
      return null;
  }
}

/** Libellé de planification : date réelle localisée ou attente honnête. */
export function scheduledLabel(scheduledAt: string | null | undefined, lang: FormatLang = 'fr'): string {
  const waiting = TRACK[lang].dateWaiting;
  if (!scheduledAt) return waiting;
  try {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return waiting;
    const date = d.toLocaleDateString(LOCALES[lang], { weekday: 'long', day: 'numeric', month: 'long' });
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${date} · ${time}`;
  } catch {
    return waiting;
  }
}

/** Carte expert : nom réel ou mention d'attribution en cours. */
export function expertDisplayName(expert: { full_name?: string | null } | null | undefined): string | null {
  const name = expert?.full_name?.trim();
  return name ? name : null;
}
