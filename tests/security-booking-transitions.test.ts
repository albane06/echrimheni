import { describe, it, expect } from 'vitest';
import { canTransition, BookingStatus, UserRole } from '@echrimheni/shared';

describe('Security: Server-Side State Machine & Role Transition Guards', () => {
  function verifyTransitionAuthorization(
    callerRole: UserRole,
    callerId: string,
    booking: { buyerId: string; expertId?: string; status: BookingStatus },
    targetStatus: BookingStatus
  ): boolean {
    if (!canTransition(booking.status, targetStatus)) {
      throw new Error(`Transition illegale de ${booking.status} vers ${targetStatus}`);
    }

    if (callerRole === 'ADMIN') return true;

    // Expert-only transitions
    if (['ACCEPTED', 'IN_PROGRESS', 'INSPECTION_COMPLETED', 'REPORT_PENDING', 'REPORT_READY'].includes(targetStatus)) {
      if (callerId !== booking.expertId) {
        throw new Error('Action reservee a l expert assigne.');
      }
    }

    // Buyer-only transitions
    if (['PUBLISHED', 'BOOKING_REQUESTED'].includes(targetStatus)) {
      if (callerId !== booking.buyerId) {
        throw new Error('Action reservee au client demandeur.');
      }
    }

    return true;
  }

  it('rejects all dangerous state skipping attacks', () => {
    const illegalTransitions: [BookingStatus, BookingStatus][] = [
      ['DRAFT', 'COMPLETED'],
      ['PUBLISHED', 'COMPLETED'],
      ['BOOKING_REQUESTED', 'REPORT_READY'],
      ['ACCEPTED', 'COMPLETED'],
      ['PAID', 'DRAFT'],
      ['COMPLETED', 'IN_PROGRESS'],
      ['REPORT_READY', 'IN_PROGRESS']
    ];

    for (const [from, to] of illegalTransitions) {
      expect(canTransition(from, to)).toBe(false);
      expect(() => 
        verifyTransitionAuthorization('BUYER', 'u1', { buyerId: 'u1', status: from }, to)
      ).toThrow();
    }
  });

  it('prevents Buyer from performing Expert transitions (e.g. accepting booking, marking in progress)', () => {
    const booking = { buyerId: 'buyer-01', expertId: 'expert-01', status: 'BOOKING_REQUESTED' as BookingStatus };

    // Buyer tries to accept their own booking
    expect(() => 
      verifyTransitionAuthorization('BUYER', 'buyer-01', booking, 'ACCEPTED')
    ).toThrow('Action reservee a l expert');

    // Assigned expert can accept
    expect(
      verifyTransitionAuthorization('EXPERT', 'expert-01', booking, 'ACCEPTED')
    ).toBe(true);
  });
});
