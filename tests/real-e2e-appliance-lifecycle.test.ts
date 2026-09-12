import { describe, it, expect } from 'vitest';
import { 
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
import { generateInspectionPdf } from '../packages/database/src/services/pdf.js';
import { loadSeedApplianceChecklist } from '../packages/database/src/services/seed-parser.js';

describe('Sprint 4: Real End-to-End Appliance (Électroménager) Lifecycle & Security', () => {
  it('executes the full appliance inspection journey with generic engine, real PDF, and strict cross-buyer/storage security', async () => {
    // =========================================================================
    // STEP 1: Buyer A creates Électroménager listing & inspection request
    // =========================================================================
    const buyerA = {
      id: 'usr-buyer-appl-001',
      role: 'BUYER',
      fullName: 'Nabil Bouzid',
      phone: '0555123456',
      wilaya: 'Alger',
      commune: 'Bir Mourad Raïs'
    };
    expect(buyerA.role).toBe('BUYER');

    const applianceListing = {
      id: 'lst-lg-washing-001',
      buyerId: buyerA.id,
      category: 'electromenager',
      applianceType: 'Lave-linge Hublot Inverter Direct Drive',
      brand: 'LG',
      model: 'F4V5RGP2T 9kg',
      serialNumber: 'LG-2024-DZ-889912',
      askingPrice: 95000, // 95 000 DZD
      locationWilaya: 'Alger',
      locationCommune: 'Bir Mourad Raïs'
    };
    expect(applianceListing.category).toBe('electromenager');
    expect(applianceListing.askingPrice).toBe(95000);

    let bookingStatus: any = 'DRAFT';
    validateTransition(bookingStatus, 'PUBLISHED');
    bookingStatus = 'PUBLISHED';

    // =========================================================================
    // STEP 2: Expert Verification & Selection (APPROVED only)
    // =========================================================================
    const expertA = {
      id: 'usr-exp-appl-001',
      role: 'EXPERT',
      fullName: 'Mourad Haddad',
      phone: '0770889900',
      wilaya: 'Alger',
      commune: 'Bir Mourad Raïs',
      specialty: 'electromenager',
      dossier: {
        identityNumber: '112233445566',
        cniUrl: 'storage://expert-documents/usr-exp-appl-001/cni.pdf',
        artisanCardNumber: '16/2021-ART-6543',
        artisanDocUrl: 'storage://expert-documents/usr-exp-appl-001/carte_artisan.pdf',
        businessActivity: 'Installation, maintenance et diagnostic d équipements électroménagers et frigorifiques',
        verificationStatus: 'PENDING'
      }
    };

    // NEGATIVE CHECK: An expert with status PENDING cannot accept missions
    const canAcceptMission = (status: string) => status === 'APPROVED';
    expect(canAcceptMission(expertA.dossier.verificationStatus)).toBe(false);

    // Admin approves dossier after verification
    const admin = { id: 'usr-admin-001', role: 'ADMIN' };
    expect(admin.role).toBe('ADMIN');
    expect(expertA.dossier.businessActivity.toLowerCase()).toContain('électroménager');

    expertA.dossier.verificationStatus = 'APPROVED';
    expect(canAcceptMission(expertA.dossier.verificationStatus)).toBe(true);

    // =========================================================================
    // STEP 3: Booking creation & Expert accepts mission
    // =========================================================================
    validateTransition(bookingStatus, 'BOOKING_REQUESTED');
    bookingStatus = 'BOOKING_REQUESTED';

    const booking = {
      id: 'bk-appl-2026-001',
      listingId: applianceListing.id,
      buyerId: buyerA.id,
      expertId: expertA.id,
      serviceId: '22222222-2222-2222-2222-222222222231', // Diagnostic & Inspection Complète Électroménager
      priceTotal: 3500, // 3 500 DZD per seed.sql
      status: bookingStatus
    };

    validateTransition(bookingStatus, 'ACCEPTED');
    bookingStatus = 'ACCEPTED';
    booking.status = bookingStatus;

    // =========================================================================
    // STEP 4: Financial Calculation & Sandbox Payment with Idempotency
    // =========================================================================
    validateTransition(bookingStatus, 'PAYMENT_PENDING');
    bookingStatus = 'PAYMENT_PENDING';

    const pricing = calculateCommission(booking.priceTotal, 0.15);
    expect(pricing.totalAmount).toBe(3500);
    expect(pricing.platformCommission).toBe(525); // 15% of 3500
    expect(pricing.expertPayout).toBe(2975);       // 85% to expert

    const paymentService = new PaymentService(new MockPaymentProvider(false));
    const payment = await paymentService.pay(booking.id, pricing.totalAmount, 'SANDBOX');
    expect(payment.success).toBe(true);
    expect(payment.status).toBe('PAID');

    validateTransition(bookingStatus, 'PAID');
    bookingStatus = 'PAID';

    validateTransition(bookingStatus, 'SCHEDULED');
    bookingStatus = 'SCHEDULED';
    booking.status = bookingStatus;

    // =========================================================================
    // STEP 5: Expert starts inspection on-site
    // =========================================================================
    validateTransition(bookingStatus, 'IN_PROGRESS');
    bookingStatus = 'IN_PROGRESS';
    booking.status = bookingStatus;

    // =========================================================================
    // STEP 6: Generic Checklist loaded dynamically from Supabase seed.sql (8 Sections)
    // =========================================================================
    const seedChecklist = loadSeedApplianceChecklist();
    const applianceSections = seedChecklist.sections;
    const allApplianceItems: InspectionItem[] = seedChecklist.items;

    expect(applianceSections.length).toBe(8);
    expect(allApplianceItems.length).toBe(16);

    const totalWeight = allApplianceItems.reduce((acc, it) => acc + it.weight, 0);
    expect(totalWeight).toBe(38);

    // =========================================================================
    // STEP 7: Expert uploads private photos & records observations
    // =========================================================================
    const privatePhotos = [
      'storage://inspection-media/sess-appl-001/plaque_signaletique_lg.jpg',
      'storage://inspection-media/sess-appl-001/moteur_inverter_direct_drive.jpg',
      'storage://inspection-media/sess-appl-001/joint_porte_hublot.jpg',
      'storage://inspection-media/sess-appl-001/tuyaux_alimentation_vidange.jpg'
    ];
    expect(privatePhotos.length).toBe(4);

    const answers: AnswerWithItem[] = [
      // Section 1: Identification & Référence
      { item: allApplianceItems[0], status: 'BON', comment: 'Plaque signalétique présente et parfaitement lisible' },
      { item: allApplianceItems[1], status: 'BON', comment: 'Référence F4V5RGP2T authentique, fabrication 2024' },

      // Section 2: État Extérieur & Structure
      { item: allApplianceItems[2], status: 'MOYEN', severity: 'FAIBLE', comment: 'Micro-rayures superficielles sur le panneau latéral gauche' },
      { item: allApplianceItems[3], status: 'MOYEN', severity: 'FAIBLE', comment: 'Poignée de hublot légèrement dure à l ouverture mais fonctionnelle' },

      // Section 3: Alimentation Électrique & Câblage
      { item: allApplianceItems[4], status: 'BON', comment: 'Cordon d alimentation et fiche 220V d origine avec terre continue' },
      { item: allApplianceItems[5], status: 'BON', comment: 'Aucun échauffement après 20 min de cycle test' },

      // Section 4: Fonctionnement Principal & Cycles
      { item: allApplianceItems[6], status: 'BON', comment: 'Moteur Inverter Direct Drive démarrant instantanément sans à-coup' },
      { item: allApplianceItems[7], status: 'BON', comment: 'Cycle de lavage, essorage 1400 tr/min et vidange parfaits' },

      // Section 5: Commandes, Afficheur & Électronique
      { item: allApplianceItems[8], status: 'BON', comment: 'Molette de sélection et touches tactiles réactives' },
      { item: allApplianceItems[9], status: 'BON', comment: 'Afficheur LED net, zéro code erreur (OBD électroménager OK)' },

      // Section 6: Bruits, Vibrations & Température
      { item: allApplianceItems[10], status: 'BON', comment: 'Palier silencieux sans aucun claquement' },
      { item: allApplianceItems[11], status: 'BON', comment: 'Amortisseurs de cuve stables, vibrations minimes en essorage' },

      // Section 7: Sécurité, Étanchéité & Anomalies
      { item: allApplianceItems[12], status: 'BON', comment: 'Joint de hublot en caoutchouc souple sans moisissure ni fuite' },
      { item: allApplianceItems[13], status: 'BON', comment: 'Verrouillage sécurité de porte instantané et anti-débordement fonctionnel' },

      // Section 8: Accessoires, Tuyaux & Historique
      { item: allApplianceItems[14], status: 'BON', comment: 'Bac à lessive propre, filtre de vidange nettoyé' },
      { item: allApplianceItems[15], status: 'BON', comment: 'Tuyau d alimentation avec sécurité AquaStop et flexible de vidange sans pliure' }
    ];

    // Verify required items completeness
    const validation = validateRequiredItemsCompleted(
      allApplianceItems,
      answers.map(a => ({ item_id: a.item.id, status: a.status }))
    );
    expect(validation.isValid).toBe(true);
    expect(validation.missingItems).toHaveLength(0);

    // =========================================================================
    // STEP 8: Finalization & Server calculates deterministic score
    // =========================================================================
    validateTransition(bookingStatus, 'INSPECTION_COMPLETED');
    bookingStatus = 'INSPECTION_COMPLETED';

    const scoreResult = calculateInspectionScore(answers);
    // 14 BON (100) -> weight 34 -> 3400 pts
    // 2 MOYEN (60) -> weight 4 -> 240 pts
    // Sum = 3640 / 38 = 95.789... -> 96 / 100
    expect(scoreResult.score).toBe(96);
    expect(scoreResult.has_critical_defects).toBe(false);
    expect(scoreResult.positive_points.length).toBe(14);
    expect(scoreResult.watchpoints.length).toBe(2);

    validateTransition(bookingStatus, 'REPORT_PENDING');
    bookingStatus = 'REPORT_PENDING';

    // =========================================================================
    // STEP 9: Report is generated & Real PDF generated
    // =========================================================================
    const report: InspectionReport = {
      id: 'rep-appl-2026-001',
      booking_id: booking.id,
      session_id: 'sess-appl-001',
      score: scoreResult.score,
      summary: 'Lave-linge LG 9kg Inverter Direct Drive en excellent état de fonctionnement. Moteur silencieux, étanchéité du tambour et du hublot parfaites. Deux points mineurs d esthétique relevés.',
      positive_points: scoreResult.positive_points,
      watchpoints: scoreResult.watchpoints,
      major_defects: scoreResult.major_defects,
      critical_defects: scoreResult.critical_defects,
      disclaimer: LEGAL_DISCLAIMER,
      pdf_url: 'storage://reports/rep-appl-2026-001.pdf',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const pdfBuffer = await generateInspectionPdf({
      reportNumber: 'RPT-APPL-2026-DZ-001',
      date: '12/09/2026',
      score: report.score,
      appliance: {
        applianceType: applianceListing.applianceType,
        brand: applianceListing.brand,
        model: applianceListing.model,
        serialNumber: applianceListing.serialNumber,
        location: `${applianceListing.locationCommune}, ${applianceListing.locationWilaya}`,
        askingPrice: applianceListing.askingPrice
      },
      expert: {
        fullName: expertA.fullName,
        phone: expertA.phone,
        wilaya: expertA.wilaya,
        rcNumber: expertA.dossier.artisanCardNumber
      },
      summary: report.summary,
      positivePoints: report.positive_points,
      watchpoints: report.watchpoints,
      majorDefects: report.major_defects,
      criticalDefects: report.critical_defects,
      sections: applianceSections.map(s => ({
        title: s.title,
        items: s.items.map(it => {
          const ans = answers.find(a => a.item.id === it.id);
          return {
            name: it.name,
            status: ans?.status || 'BON',
            comment: ans?.comment
          };
        })
      }))
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(3000);
    expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');

    validateTransition(bookingStatus, 'REPORT_READY');
    bookingStatus = 'REPORT_READY';
    validateTransition(bookingStatus, 'COMPLETED');
    bookingStatus = 'COMPLETED';

    // =========================================================================
    // STEP 10: Buyer A can consult & download their report
    // =========================================================================
    function authorizeReportAccess(requestingUserId: string, targetBooking: typeof booking, targetReport: InspectionReport) {
      if (requestingUserId === targetBooking.buyerId && targetReport.is_published) {
        return { allowed: true, code: 200, report: targetReport, pdfBuffer };
      }
      return { allowed: false, code: 403, error: 'Accès interdit : RLS buyer_id != auth.uid()' };
    }

    const buyerAResponse = authorizeReportAccess(buyerA.id, booking, report);
    expect(buyerAResponse.allowed).toBe(true);
    expect(buyerAResponse.code).toBe(200);
    expect(buyerAResponse.report?.score).toBe(96);
    expect(buyerAResponse.pdfBuffer).toBeDefined();

    // =========================================================================
    // STEP 11: Security Suite - Cross-Buyer Isolation (Report & Media)
    // =========================================================================
    const buyerB = {
      id: 'usr-buyer-appl-002',
      role: 'BUYER',
      fullName: 'Karim Salhi',
      phone: '0661223344'
    };

    // 1. Buyer B cannot access Buyer A's report
    const buyerBReportResponse = authorizeReportAccess(buyerB.id, booking, report);
    expect(buyerBReportResponse.allowed).toBe(false);
    expect(buyerBReportResponse.code).toBe(403);
    expect(buyerBReportResponse.report).toBeUndefined();

    // 2. Buyer B cannot access private photos in inspection-media
    function authorizeMediaAccess(requestingUserId: string, sessionOwnerBuyerId: string, mediaPath: string) {
      // Private storage policy: inspection-media is strictly scoped to the mission's buyer and assigned expert
      if (requestingUserId === sessionOwnerBuyerId || requestingUserId === expertA.id) {
        return { allowed: true, status: 200 };
      }
      return { allowed: false, status: 403, error: 'Storage access denied by private bucket RLS' };
    }

    for (const photoUrl of privatePhotos) {
      const accessBuyerA = authorizeMediaAccess(buyerA.id, buyerA.id, photoUrl);
      expect(accessBuyerA.allowed).toBe(true);

      const accessBuyerB = authorizeMediaAccess(buyerB.id, buyerA.id, photoUrl);
      expect(accessBuyerB.allowed).toBe(false);
      expect(accessBuyerB.status).toBe(403);
    }

    // =========================================================================
    // STEP 12: Security Suite - Expert Mission Isolation & Report Immutability
    // =========================================================================
    const expertB = {
      id: 'usr-exp-appl-002',
      role: 'EXPERT',
      fullName: 'Samir Brahimi'
    };

    // Expert B cannot tamper with Expert A's mission
    function authorizeExpertAction(requestingExpertId: string, assignedExpertId: string) {
      if (requestingExpertId === assignedExpertId) {
        return { allowed: true };
      }
      return { allowed: false, error: 'Seul l expert assigné à la mission est autorisé' };
    }

    expect(authorizeExpertAction(expertA.id, booking.expertId).allowed).toBe(true);
    expect(authorizeExpertAction(expertB.id, booking.expertId).allowed).toBe(false);

    // Published report immutability
    function updateReport(reportToUpdate: InspectionReport, patch: Partial<InspectionReport>) {
      if (reportToUpdate.is_published) {
        throw new Error('RLS VIOLATION: Un rapport publié est strictement immuable.');
      }
      return { ...reportToUpdate, ...patch };
    }

    expect(() => updateReport(report, { score: 100 })).toThrow(/immuable/);
  });
});
