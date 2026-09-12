import { describe, it, expect } from 'vitest';
import { 
  canTransition, 
  validateTransition, 
  calculateCommission, 
  PaymentService, 
  MockPaymentProvider,
  calculateInspectionScore,
  validateRequiredItemsCompleted,
  InspectionItem,
  AnswerWithItem,
  InspectionReport,
  LEGAL_DISCLAIMER
} from '@echrimheni/shared';

describe('End-to-End Vertical Slice: Automobile Pre-purchase Inspection', () => {
  // Step 1: Automobile Checklist Items Setup (representing the 7 sections)
  const automobileChecklistItems: InspectionItem[] = [
    // Section 1: Moteur
    { id: 'item-moteur-1', section_id: 'sec-moteur', name: 'Démarrage & Bruits', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: 'item-moteur-2', section_id: 'sec-moteur', name: 'Fumée échappement', weight: 3, is_required: true, order_index: 2, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    // Section 2: Freinage
    { id: 'item-frein-1', section_id: 'sec-frein', name: 'Disques & Plaquettes', weight: 2, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    // Section 3: Suspension & Direction
    { id: 'item-susp-1', section_id: 'sec-susp', name: 'Amortisseurs & Direction', weight: 2, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    // Section 4: Carrosserie & Châssis
    { id: 'item-carrosserie-1', section_id: 'sec-carrosserie', name: 'Chocs & Alignement panneaux', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    // Section 5: Pneumatiques
    { id: 'item-pneus-1', section_id: 'sec-pneus', name: 'État des pneus', weight: 2, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    // Section 6: Électronique & OBD
    { id: 'item-elec-1', section_id: 'sec-elec', name: 'Voyants tableau de bord', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    // Section 7: Habitacle
    { id: 'item-interieur-1', section_id: 'sec-interieur', name: 'Sellerie & Équipements', weight: 1, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] }
  ];

  it('executes the full lifecycle from Buyer request to final report consultation', async () => {
    // 1. Buyer creates listing and booking draft
    let currentStatus: any = 'DRAFT';
    validateTransition(currentStatus, 'PUBLISHED');
    currentStatus = 'PUBLISHED';

    // 2. Buyer selects approved expert and requests booking
    validateTransition(currentStatus, 'BOOKING_REQUESTED');
    currentStatus = 'BOOKING_REQUESTED';

    // 3. Expert reviews request and accepts
    validateTransition(currentStatus, 'ACCEPTED');
    currentStatus = 'ACCEPTED';

    // 4. Payment flow: Commission calculation and sandbox payment
    validateTransition(currentStatus, 'PAYMENT_PENDING');
    currentStatus = 'PAYMENT_PENDING';

    const basePrice = 7000;
    const pricing = calculateCommission(basePrice, 0.15);
    expect(pricing.platformCommission).toBe(1050);
    expect(pricing.expertPayout).toBe(5950);

    const paymentService = new PaymentService(new MockPaymentProvider());
    const paymentResult = await paymentService.pay('booking-auto-01', pricing.totalAmount, 'SANDBOX');
    expect(paymentResult.success).toBe(true);

    validateTransition(currentStatus, 'PAID');
    currentStatus = 'PAID';

    // 5. Booking scheduled
    validateTransition(currentStatus, 'SCHEDULED');
    currentStatus = 'SCHEDULED';

    // 6. Expert arrives on-site and starts inspection
    validateTransition(currentStatus, 'IN_PROGRESS');
    currentStatus = 'IN_PROGRESS';

    // 7. Expert completes checklist for all 7 automobile sections
    const expertAnswers: AnswerWithItem[] = [
      { item: automobileChecklistItems[0], status: 'BON', comment: 'Démarrage immédiat sans bruit suspect' },
      { item: automobileChecklistItems[1], status: 'BON' },
      { item: automobileChecklistItems[2], status: 'MOYEN', comment: 'Plaquettes avant à 40% d\'usure' },
      { item: automobileChecklistItems[3], status: 'BON' },
      { item: automobileChecklistItems[4], status: 'BON', comment: 'Peinture d\'origine constatée au micromètre' },
      { item: automobileChecklistItems[5], status: 'BON' },
      { item: automobileChecklistItems[6], status: 'BON', comment: 'Aucun voyant anomalie allumé' },
      { item: automobileChecklistItems[7], status: 'BON' }
    ];

    // Verification that all required items are filled
    const validation = validateRequiredItemsCompleted(
      automobileChecklistItems, 
      expertAnswers.map(a => ({ item_id: a.item.id, status: a.status }))
    );
    expect(validation.isValid).toBe(true);

    // 8. Inspection completion & scoring
    validateTransition(currentStatus, 'INSPECTION_COMPLETED');
    currentStatus = 'INSPECTION_COMPLETED';

    const scoreResult = calculateInspectionScore(expertAnswers);
    expect(scoreResult.score).toBeGreaterThanOrEqual(90);
    expect(scoreResult.positive_points.length).toBe(7);
    expect(scoreResult.watchpoints.length).toBe(1);
    expect(scoreResult.has_critical_defects).toBe(false);

    // 9. Report preparation & publication
    validateTransition(currentStatus, 'REPORT_PENDING');
    currentStatus = 'REPORT_PENDING';

    const finalReport: InspectionReport = {
      id: 'report-auto-01',
      booking_id: 'booking-auto-01',
      session_id: 'session-auto-01',
      score: scoreResult.score,
      summary: 'Véhicule en excellent état général, contrôles mécaniques et structurels conformes.',
      positive_points: scoreResult.positive_points,
      watchpoints: scoreResult.watchpoints,
      major_defects: scoreResult.major_defects,
      critical_defects: scoreResult.critical_defects,
      disclaimer: LEGAL_DISCLAIMER,
      pdf_url: 'https://storage.echrimheni.dz/reports/report-auto-01.pdf',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    validateTransition(currentStatus, 'REPORT_READY');
    currentStatus = 'REPORT_READY';

    // 10. Buyer consults report & mission is completed
    expect(finalReport.is_published).toBe(true);
    expect(finalReport.disclaimer).toContain('L’inspection reflète l’état constaté');
    expect(finalReport.score).toBeGreaterThan(0);

    validateTransition(currentStatus, 'COMPLETED');
    currentStatus = 'COMPLETED';

    expect(currentStatus).toBe('COMPLETED');
  });
});
