import { describe, it, expect } from 'vitest';
import { calculateCommission, MockPaymentProvider, PaymentService } from '@echrimheni/shared';

describe('Payment & Commission Service', () => {
  it('should correctly calculate 15% platform commission and 85% expert payout', () => {
    const basePrice = 10000;
    const breakdown = calculateCommission(basePrice, 0.15);

    expect(breakdown.totalAmount).toBe(10000);
    expect(breakdown.platformCommission).toBe(1500);
    expect(breakdown.expertPayout).toBe(8500);
    expect(breakdown.platformCommission + breakdown.expertPayout).toBe(basePrice);
  });

  it('should handle standard 7000 DZD automobile inspection pricing', () => {
    const breakdown = calculateCommission(7000);
    expect(breakdown.platformCommission).toBe(1050);
    expect(breakdown.expertPayout).toBe(5950);
  });

  it('should reject negative pricing', () => {
    expect(() => calculateCommission(-500)).toThrow();
  });

  it('should process sandbox payments successfully', async () => {
    const provider = new MockPaymentProvider();
    const service = new PaymentService(provider);

    const result = await service.pay('booking-123', 7000, 'SANDBOX');
    expect(result.success).toBe(true);
    expect(result.status).toBe('PAID');
    expect(result.transactionRef).toContain('TX-OK-');
  });

  it('should handle payment failure simulation when configured', async () => {
    const provider = new MockPaymentProvider(true); // shouldFail = true
    const service = new PaymentService(provider);

    const result = await service.pay('booking-fail', 7000, 'SANDBOX');
    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
  });

  it('should support CASH mode confirmation', async () => {
    const provider = new MockPaymentProvider();
    const service = new PaymentService(provider);

    const result = await service.pay('booking-cash', 7000, 'CASH');
    expect(result.success).toBe(true);
    expect(result.status).toBe('PAID');
    expect(result.message).toContain('espèces');
  });
});
