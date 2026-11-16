import React from 'react';
import { cn } from '@/lib/utils';
import type { ExpertVerificationStatus, BookingStatus, PaymentStatus } from '@echrimheni/shared';

type StatusConfig = { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' };

const expertStatusMap: Record<ExpertVerificationStatus, StatusConfig> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  APPROVED: { label: 'Approuvé', variant: 'success' },
  REJECTED: { label: 'Rejeté', variant: 'danger' },
  SUSPENDED: { label: 'Suspendu', variant: 'danger' },
};

const bookingStatusMap: Record<BookingStatus, StatusConfig> = {
  DRAFT: { label: 'Brouillon', variant: 'neutral' },
  PUBLISHED: { label: 'Publiée', variant: 'info' },
  BOOKING_REQUESTED: { label: 'Demandée', variant: 'warning' },
  ACCEPTED: { label: 'Acceptée', variant: 'info' },
  PAYMENT_PENDING: { label: 'Paiement en attente', variant: 'warning' },
  PAID: { label: 'Payée', variant: 'success' },
  SCHEDULED: { label: 'Planifiée', variant: 'info' },
  IN_PROGRESS: { label: 'En cours', variant: 'info' },
  INSPECTION_COMPLETED: { label: 'Inspection terminée', variant: 'success' },
  REPORT_PENDING: { label: 'Rapport en attente', variant: 'warning' },
  REPORT_READY: { label: 'Rapport prêt', variant: 'success' },
  COMPLETED: { label: 'Terminée', variant: 'success' },
  CANCELLED: { label: 'Annulée', variant: 'neutral' },
  DISPUTED: { label: 'Litige', variant: 'danger' },
  REJECTED: { label: 'Rejetée', variant: 'danger' },
  EXPIRED: { label: 'Expirée', variant: 'neutral' },
};

const paymentStatusMap: Record<PaymentStatus, StatusConfig> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  PAID: { label: 'Payé', variant: 'success' },
  FAILED: { label: 'Échoué', variant: 'danger' },
  REFUNDED: { label: 'Remboursé', variant: 'info' },
  CANCELLED: { label: 'Annulé', variant: 'neutral' },
};

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-50 text-slate-500 border-slate-200',
};

const dotStyles = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
};

interface StatusBadgeProps {
  className?: string;
}

interface ExpertStatusBadgeProps extends StatusBadgeProps {
  status: ExpertVerificationStatus;
}

interface BookingStatusBadgeProps extends StatusBadgeProps {
  status: BookingStatus;
}

interface PaymentStatusBadgeProps extends StatusBadgeProps {
  status: PaymentStatus;
}

function StatusBadgeBase({ label, variant, className }: { label: string; variant: keyof typeof variantStyles; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
        variantStyles[variant],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />
      {label}
    </span>
  );
}

export function ExpertStatusBadge({ status, className }: ExpertStatusBadgeProps) {
  const config = expertStatusMap[status];
  return <StatusBadgeBase label={config.label} variant={config.variant} className={className} />;
}

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const config = bookingStatusMap[status];
  return <StatusBadgeBase label={config.label} variant={config.variant} className={className} />;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = paymentStatusMap[status];
  return <StatusBadgeBase label={config.label} variant={config.variant} className={className} />;
}
