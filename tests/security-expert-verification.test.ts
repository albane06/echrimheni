import { describe, it, expect } from 'vitest';
import { ExpertVerificationStatus, AdminVerifyExpertSchema } from '@echrimheni/shared';

describe('Security: Expert Verification & Eligibility Enforcement', () => {
  function canExpertAcceptMission(status: ExpertVerificationStatus): boolean {
    return status === 'APPROVED';
  }

  it('strictly excludes PENDING, REJECTED and SUSPENDED experts from missions', () => {
    expect(canExpertAcceptMission('PENDING')).toBe(false);
    expect(canExpertAcceptMission('REJECTED')).toBe(false);
    expect(canExpertAcceptMission('SUSPENDED')).toBe(false);
    expect(canExpertAcceptMission('APPROVED')).toBe(true);
  });

  it('mandates an explicit rejection reason with at least 5 characters', () => {
    const validApproval = AdminVerifyExpertSchema.safeParse({
      expert_id: '11111111-1111-1111-1111-111111111111',
      status: 'APPROVED'
    });
    expect(validApproval.success).toBe(true);

    const invalidRejectionNoReason = AdminVerifyExpertSchema.safeParse({
      expert_id: '11111111-1111-1111-1111-111111111111',
      status: 'REJECTED'
    });
    expect(invalidRejectionNoReason.success).toBe(false);

    const invalidRejectionShortReason = AdminVerifyExpertSchema.safeParse({
      expert_id: '11111111-1111-1111-1111-111111111111',
      status: 'REJECTED',
      rejection_reason: 'bad'
    });
    expect(invalidRejectionShortReason.success).toBe(false);

    const validRejection = AdminVerifyExpertSchema.safeParse({
      expert_id: '11111111-1111-1111-1111-111111111111',
      status: 'REJECTED',
      rejection_reason: 'Activite du registre de commerce non concordante'
    });
    expect(validRejection.success).toBe(true);
  });
});
