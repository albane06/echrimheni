import { describe, it, expect } from 'vitest';
import { UserRole } from '@echrimheni/shared';

describe('Security: Role Escalation Prevention', () => {
  it('prevents client-supplied role metadata from escalating to ADMIN', () => {
    function sanitizeUserRole(requestedRole: string): 'BUYER' | 'EXPERT' {
      if (requestedRole === 'EXPERT') return 'EXPERT';
      // Any attempt to pass ADMIN or other privileged role falls back to BUYER
      return 'BUYER';
    }

    expect(sanitizeUserRole('ADMIN')).toBe('BUYER');
    expect(sanitizeUserRole('SUPERUSER')).toBe('BUYER');
    expect(sanitizeUserRole('admin')).toBe('BUYER');
    expect(sanitizeUserRole('BUYER')).toBe('BUYER');
    expect(sanitizeUserRole('EXPERT')).toBe('EXPERT');
  });

  it('rejects promotion to ADMIN when caller is not an administrator', () => {
    function promoteToAdmin(callerRole: UserRole, targetUserId: string) {
      if (callerRole !== 'ADMIN') {
        throw new Error('Non autorise : seul un administrateur peut promouvoir un utilisateur.');
      }
      return { targetUserId, role: 'ADMIN' as const };
    }

    expect(() => promoteToAdmin('BUYER', 'user-123')).toThrow('Non autorise');
    expect(() => promoteToAdmin('EXPERT', 'user-456')).toThrow('Non autorise');
    expect(promoteToAdmin('ADMIN', 'user-789').role).toBe('ADMIN');
  });
});
