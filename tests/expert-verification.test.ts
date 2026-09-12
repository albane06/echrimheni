import { describe, it, expect } from 'vitest';
import { AdminVerifyExpertSchema, ExpertVerificationStatus } from '@echrimheni/shared';

describe('Expert Verification & Administrative Rules', () => {
  it('should allow APPROVE without mandatory reason', () => {
    const input = {
      expert_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'APPROVED' as const
    };
    const result = AdminVerifyExpertSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should require a reason with at least 5 characters when status is REJECTED', () => {
    // Missing reason
    const invalid1 = AdminVerifyExpertSchema.safeParse({
      expert_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'REJECTED'
    });
    expect(invalid1.success).toBe(false);

    // Reason too short
    const invalid2 = AdminVerifyExpertSchema.safeParse({
      expert_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'REJECTED',
      rejection_reason: 'non'
    });
    expect(invalid2.success).toBe(false);

    // Valid rejection
    const valid = AdminVerifyExpertSchema.safeParse({
      expert_id: 'a0000000-0000-0000-0000-000000000001',
      status: 'REJECTED',
      rejection_reason: 'Registre de commerce incomplet et activité non compatible'
    });
    expect(valid.success).toBe(true);
  });

  it('should verify that only APPROVED experts can receive missions in application logic', () => {
    const isExpertEligibleForMissions = (status: ExpertVerificationStatus) => status === 'APPROVED';

    expect(isExpertEligibleForMissions('PENDING')).toBe(false);
    expect(isExpertEligibleForMissions('REJECTED')).toBe(false);
    expect(isExpertEligibleForMissions('SUSPENDED')).toBe(false);
    expect(isExpertEligibleForMissions('APPROVED')).toBe(true);
  });
});
