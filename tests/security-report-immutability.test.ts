import { describe, it, expect } from 'vitest';

describe('Security: Report Immutability', () => {
  interface ReportRecord {
    id: string;
    is_published: boolean;
    score: number;
    summary: string;
  }

  function updateReport(
    report: ReportRecord, 
    callerRole: 'EXPERT' | 'BUYER' | 'ADMIN', 
    callerId: string, 
    inspectorId: string,
    updates: Partial<ReportRecord>
  ) {
    if (report.is_published && callerRole !== 'ADMIN') {
      throw new Error('Non autorise : le rapport est publie et immuable. Les corrections necessitent un avenant versionne.');
    }

    if (callerRole === 'EXPERT' && callerId !== inspectorId) {
      throw new Error('Non autorise : seul l expert redacteur peut modifier le brouillon.');
    }

    return { ...report, ...updates };
  }

  it('allows updates while report is draft (is_published = false)', () => {
    const draft: ReportRecord = { id: 'r1', is_published: false, score: 90, summary: 'Brouillon initial' };
    const updated = updateReport(draft, 'EXPERT', 'exp-1', 'exp-1', { score: 94, summary: 'Brouillon enrichi' });
    expect(updated.score).toBe(94);
  });

  it('strictly forbids expert modification once report is published (is_published = true)', () => {
    const published: ReportRecord = { id: 'r1', is_published: true, score: 94, summary: 'Rapport officiel valide' };
    
    expect(() => 
      updateReport(published, 'EXPERT', 'exp-1', 'exp-1', { score: 99 })
    ).toThrow('le rapport est publie et immuable');

    expect(() => 
      updateReport(published, 'BUYER', 'buyer-1', 'exp-1', { score: 100 })
    ).toThrow('le rapport est publie et immuable');
  });
});
