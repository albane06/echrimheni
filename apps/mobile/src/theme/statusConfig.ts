/**
 * P7.1 — Mapping présentation des statuts métier (spec UI/UX §5.4).
 * Couche de présentation UNIQUEMENT : aucun statut backend n'est renommé
 * ni modifié. Tout statut sans équivalent spec tombe sur `pending`
 * (règle du document) et est listé dans `FALLBACK_STATUSES` ci-dessous.
 */
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  Loader,
  Navigation,
  ScanLine,
  UserCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from './tokens';

export type SpecStatusKey =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'expert_assigned'
  | 'on_the_way'
  | 'in_inspection'
  | 'analyzing'
  | 'report_ready'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface StatusPresentation {
  key: SpecStatusKey;
  label: string;
  background: string;
  foreground: string;
  Icon: LucideIcon;
}

const CONFIG: Record<SpecStatusKey, Omit<StatusPresentation, 'key'>> = {
  pending: {
    label: 'En attente',
    background: colors.warning.bg,
    foreground: colors.warning.text,
    Icon: Clock,
  },
  awaiting_payment: {
    label: 'Paiement en attente',
    background: colors.warning.bg,
    foreground: colors.warning.text,
    Icon: CreditCard,
  },
  confirmed: {
    label: 'Confirmée',
    background: colors.primary[50],
    foreground: colors.primary[700],
    Icon: CalendarCheck,
  },
  expert_assigned: {
    label: 'Expert assigné',
    background: colors.primary[50],
    foreground: colors.primary[700],
    Icon: UserCheck,
  },
  on_the_way: {
    label: 'Expert en route',
    background: colors.primary[100],
    foreground: colors.primary[700],
    Icon: Navigation,
  },
  in_inspection: {
    label: 'En inspection',
    background: colors.secondary[50],
    foreground: colors.secondary[700],
    Icon: ScanLine,
  },
  analyzing: {
    label: 'Analyse en cours',
    background: colors.secondary[50],
    foreground: colors.secondary[700],
    Icon: Loader,
  },
  report_ready: {
    label: 'Rapport disponible',
    background: colors.success.bg,
    foreground: colors.success.text,
    Icon: FileCheck2,
  },
  completed: {
    label: 'Terminée',
    background: colors.bg.subtle,
    foreground: colors.text.secondary,
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Annulée',
    background: colors.bg.subtle,
    foreground: colors.text.secondary,
    Icon: XCircle,
  },
  failed: {
    label: 'Échec / Refusée',
    background: colors.danger.bg,
    foreground: colors.danger.text,
    Icon: AlertTriangle,
  },
};

/**
 * Statuts backend → clé spec. Les statuts métier restent inchangés ;
 * seul l'affichage est mappé.
 */
const BACKEND_TO_SPEC: Record<string, SpecStatusKey> = {
  BOOKING_REQUESTED: 'pending',
  PAYMENT_PENDING: 'awaiting_payment',
  ACCEPTED: 'confirmed',
  PAID: 'confirmed',
  SCHEDULED: 'expert_assigned',
  IN_PROGRESS: 'in_inspection',
  INSPECTION_COMPLETED: 'analyzing',
  REPORT_PENDING: 'analyzing',
  REPORT_READY: 'report_ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'failed',
  EXPIRED: 'cancelled',
};

/**
 * Statuts backend SANS équivalent spec (fallback `pending` appliqué,
 * conformément au document §5.4) :
 * - DRAFT / PUBLISHED : états internes de brouillon d'annonce, jamais
 *   affichés comme badge de demande côté mobile.
 * - DISPUTED : litige en cours — aucun badge « litige » au spec ; à
 *   trancher en P7.8 (proposition : variante `failed` avec libellé
 *   « Litige en cours », décision produit requise).
 */
export const FALLBACK_STATUSES = ['DRAFT', 'PUBLISHED', 'DISPUTED'] as const;

export function getStatusPresentation(backendStatus: string | null | undefined): StatusPresentation {
  const key: SpecStatusKey =
    (backendStatus && (BACKEND_TO_SPEC[backendStatus] as SpecStatusKey | undefined)) ||
    (backendStatus && (CONFIG[backendStatus as SpecStatusKey] ? (backendStatus as SpecStatusKey) : undefined)) ||
    'pending';
  return { key, ...CONFIG[key] };
}
