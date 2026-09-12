import { PaymentMethod, PaymentStatus } from '../types/index.js';

export interface CommissionBreakdown {
  totalAmount: number;
  platformCommission: number;
  expertPayout: number;
  commissionRate: number; // e.g. 0.15 for 15%
}

export function calculateCommission(basePrice: number, commissionRate = 0.15): CommissionBreakdown {
  if (basePrice < 0) {
    throw new Error('Le prix de base ne peut pas être négatif');
  }
  const platformCommission = Math.round(basePrice * commissionRate);
  const expertPayout = basePrice - platformCommission;

  return {
    totalAmount: basePrice,
    platformCommission,
    expertPayout,
    commissionRate
  };
}

export interface PaymentExecutionResult {
  success: boolean;
  transactionRef: string;
  status: PaymentStatus;
  message: string;
}

export interface PaymentProvider {
  processPayment(bookingId: string, amount: number, method: PaymentMethod): Promise<PaymentExecutionResult>;
  refundPayment(transactionRef: string, amount: number): Promise<PaymentExecutionResult>;
}

export class MockPaymentProvider implements PaymentProvider {
  constructor(private shouldFail = false) {}

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async processPayment(bookingId: string, amount: number, method: PaymentMethod): Promise<PaymentExecutionResult> {
    if (this.shouldFail) {
      return {
        success: false,
        transactionRef: `TX-FAIL-${Date.now()}`,
        status: 'FAILED',
        message: 'Paiement sandbox simulé rejeté (solde insuffisant ou carte invalide).'
      };
    }

    return {
      success: true,
      transactionRef: `TX-OK-${Date.now()}-${bookingId.slice(0, 8)}`,
      status: 'PAID',
      message: method === 'CASH' 
        ? 'Mode espèces enregistré. Paiement à remettre lors de l\'inspection.'
        : 'Paiement sandbox validé avec succès.'
    };
  }

  async refundPayment(transactionRef: string, amount: number): Promise<PaymentExecutionResult> {
    return {
      success: true,
      transactionRef: `REFUND-${transactionRef}`,
      status: 'REFUNDED',
      message: `Remboursement de ${amount} DZD effectué avec succès.`
    };
  }
}

export class PaymentService {
  constructor(private provider: PaymentProvider = new MockPaymentProvider()) {}

  async pay(bookingId: string, amount: number, method: PaymentMethod = 'SANDBOX') {
    return this.provider.processPayment(bookingId, amount, method);
  }

  async refund(transactionRef: string, amount: number) {
    return this.provider.refundPayment(transactionRef, amount);
  }
}
