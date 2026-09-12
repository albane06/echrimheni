import { describe, it, expect } from 'vitest';
import { 
  calculateInspectionScore, 
  validateRequiredItemsCompleted, 
  InspectionItem, 
  AnswerWithItem,
  LEGAL_DISCLAIMER 
} from '@echrimheni/shared';

const mockItem = (id: string, name: string, weight = 1, is_required = true): InspectionItem => ({
  id,
  section_id: 'sec-1',
  name,
  weight,
  is_required,
  order_index: 1,
  possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
  possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE']
});

describe('Inspection Scoring Algorithm', () => {
  it('should return 100 for a flawless vehicle with all items BON', () => {
    const items = [
      mockItem('1', 'Moteur'),
      mockItem('2', 'Freinage'),
      mockItem('3', 'Carrosserie')
    ];

    const answers: AnswerWithItem[] = items.map(item => ({
      item,
      status: 'BON'
    }));

    const result = calculateInspectionScore(answers);
    expect(result.score).toBe(100);
    expect(result.positive_points.length).toBe(3);
    expect(result.has_critical_defects).toBe(false);
    expect(result.disclaimer).toBe(LEGAL_DISCLAIMER);
  });

  it('should compute weighted averages correctly for mixed condition vehicle', () => {
    const item1 = mockItem('1', 'Moteur', 3);
    const item2 = mockItem('2', 'Pneus', 1);

    const answers: AnswerWithItem[] = [
      { item: item1, status: 'BON' }, // 100 * 3 = 300
      { item: item2, status: 'MOYEN' } // 60 * 1 = 60
    ]; // totalWeight = 4, earned = 360 -> score = 90

    const result = calculateInspectionScore(answers);
    expect(result.score).toBe(90);
    expect(result.positive_points).toContain('Moteur');
    expect(result.watchpoints).toContain('Pneus');
  });

  it('should severely penalize and flag critical defects', () => {
    const item1 = mockItem('1', 'Moteur', 3);
    const item2 = mockItem('2', 'Freinage', 3);

    const answers: AnswerWithItem[] = [
      { item: item1, status: 'BON' },
      { item: item2, status: 'MAUVAIS', severity: 'CRITIQUE', comment: 'Fuite hydraulique majeure' }
    ];

    const result = calculateInspectionScore(answers);
    expect(result.has_critical_defects).toBe(true);
    expect(result.critical_defects.length).toBe(1);
    expect(result.score).toBeLessThanOrEqual(49);
  });

  it('should validate whether all required items are answered', () => {
    const req1 = mockItem('1', 'Moteur', 1, true);
    const req2 = mockItem('2', 'Freins', 1, true);
    const opt3 = mockItem('3', 'Climatisation', 1, false);

    const incompleteAnswers = [{ item_id: '1', status: 'BON' as const }];
    const check1 = validateRequiredItemsCompleted([req1, req2, opt3], incompleteAnswers);
    expect(check1.isValid).toBe(false);
    expect(check1.missingItems.length).toBe(1);
    expect(check1.missingItems[0].id).toBe('2');

    const completeAnswers = [
      { item_id: '1', status: 'BON' as const },
      { item_id: '2', status: 'MOYEN' as const }
    ];
    const check2 = validateRequiredItemsCompleted([req1, req2, opt3], completeAnswers);
    expect(check2.isValid).toBe(true);
    expect(check2.missingItems.length).toBe(0);
  });
});
