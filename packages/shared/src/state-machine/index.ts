import { BookingStatus } from '../types/index.js';

export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['BOOKING_REQUESTED'],
  BOOKING_REQUESTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SCHEDULED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['INSPECTION_COMPLETED'],
  INSPECTION_COMPLETED: ['REPORT_PENDING'],
  REPORT_PENDING: ['REPORT_READY'],
  REPORT_READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  EXPIRED: []
};

export class InvalidStateTransitionError extends Error {
  constructor(public currentStatus: BookingStatus, public targetStatus: BookingStatus) {
    super(`Transition invalide : impossible de passer du statut ${currentStatus} à ${targetStatus}.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export function canTransition(current: BookingStatus, target: BookingStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}

export function validateTransition(current: BookingStatus, target: BookingStatus): void {
  if (!canTransition(current, target)) {
    throw new InvalidStateTransitionError(current, target);
  }
}
