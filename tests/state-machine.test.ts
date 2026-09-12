import { describe, it, expect } from 'vitest';
import { canTransition, validateTransition, InvalidStateTransitionError } from '@echrimheni/shared';

describe('Booking State Machine', () => {
  it('should allow valid transitions across the happy path', () => {
    expect(canTransition('DRAFT', 'PUBLISHED')).toBe(true);
    expect(canTransition('PUBLISHED', 'BOOKING_REQUESTED')).toBe(true);
    expect(canTransition('BOOKING_REQUESTED', 'ACCEPTED')).toBe(true);
    expect(canTransition('ACCEPTED', 'PAYMENT_PENDING')).toBe(true);
    expect(canTransition('PAYMENT_PENDING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'SCHEDULED')).toBe(true);
    expect(canTransition('SCHEDULED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'INSPECTION_COMPLETED')).toBe(true);
    expect(canTransition('INSPECTION_COMPLETED', 'REPORT_PENDING')).toBe(true);
    expect(canTransition('REPORT_PENDING', 'REPORT_READY')).toBe(true);
    expect(canTransition('REPORT_READY', 'COMPLETED')).toBe(true);
  });

  it('should allow cancellation and rejection where appropriate', () => {
    expect(canTransition('BOOKING_REQUESTED', 'REJECTED')).toBe(true);
    expect(canTransition('ACCEPTED', 'CANCELLED')).toBe(true);
    expect(canTransition('PAYMENT_PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('SCHEDULED', 'CANCELLED')).toBe(true);
  });

  it('should strictly reject illegal jumps and throw InvalidStateTransitionError', () => {
    // DRAFT cannot jump to COMPLETED
    expect(canTransition('DRAFT', 'COMPLETED')).toBe(false);
    expect(() => validateTransition('DRAFT', 'COMPLETED')).toThrow(InvalidStateTransitionError);

    // BOOKING_REQUESTED cannot jump to IN_PROGRESS directly
    expect(canTransition('BOOKING_REQUESTED', 'IN_PROGRESS')).toBe(false);
    expect(() => validateTransition('BOOKING_REQUESTED', 'IN_PROGRESS')).toThrow(InvalidStateTransitionError);

    // PAID cannot jump to COMPLETED without inspection and report
    expect(canTransition('PAID', 'COMPLETED')).toBe(false);
    expect(() => validateTransition('PAID', 'COMPLETED')).toThrow(InvalidStateTransitionError);

    // Terminal state COMPLETED cannot transition backwards
    expect(canTransition('COMPLETED', 'DRAFT')).toBe(false);
    expect(() => validateTransition('COMPLETED', 'DRAFT')).toThrow(InvalidStateTransitionError);
  });
});
