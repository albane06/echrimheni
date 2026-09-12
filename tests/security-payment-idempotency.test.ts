import { describe, it, expect } from 'vitest';
import { calculateCommission } from '@echrimheni/shared';

describe('Security: Financial Integrity & Payment Idempotency', () => {
  interface MockDbPayment {
    id: string;
    bookingId: string;
    amount: number;
    transactionRef: string;
    status: 'PAID' | 'FAILED';
  }

  class MockPaymentGatewayDb {
    private payments: Map<string, MockDbPayment> = new Map();

    processPayment(bookingId: string, amount: number, transactionRef: string) {
      if (amount <= 0) {
        throw new Error('Montant invalide : doit etre superieur a zero.');
      }

      // Idempotency check: if transactionRef already exists, return existing record
      const existing = this.payments.get(transactionRef);
      if (existing) {
        return {
          payment: existing,
          isIdempotentReplay: true,
          message: 'Paiement deja enregistre (idempotent).'
        };
      }

      const newPayment: MockDbPayment = {
        id: 'pay-' + Date.now(),
        bookingId,
        amount,
        transactionRef,
        status: 'PAID'
      };

      this.payments.set(transactionRef, newPayment);
      return {
        payment: newPayment,
        isIdempotentReplay: false,
        message: 'Paiement execute avec succes.'
      };
    }
  }

  it('safely handles repeated calls with the same transaction reference without duplicate charges', () => {
    const db = new MockPaymentGatewayDb();
    const txRef = 'TX-SECURE-998877';

    // First payment attempt
    const firstCall = db.processPayment('booking-001', 7000, txRef);
    expect(firstCall.isIdempotentReplay).toBe(false);
    expect(firstCall.payment.status).toBe('PAID');

    // Replay attack / network retry with exact same reference
    const secondCall = db.processPayment('booking-001', 7000, txRef);
    expect(secondCall.isIdempotentReplay).toBe(true);
    expect(secondCall.payment.id).toBe(firstCall.payment.id);
  });

  it('rejects zero or negative payments', () => {
    const db = new MockPaymentGatewayDb();
    expect(() => db.processPayment('booking-001', 0, 'TX-ZERO')).toThrow('Montant invalide');
    expect(() => db.processPayment('booking-001', -500, 'TX-NEG')).toThrow('Montant invalide');
  });

  it('accurately computes non-negative commission and expert payout splits', () => {
    const pricing = calculateCommission(7000, 0.15);
    expect(pricing.platformCommission).toBe(1050);
    expect(pricing.expertPayout).toBe(5950);
    expect(pricing.platformCommission + pricing.expertPayout).toBe(7000);
    expect(pricing.platformCommission).toBeGreaterThanOrEqual(0);
    expect(pricing.expertPayout).toBeGreaterThanOrEqual(0);
  });
});
