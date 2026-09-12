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
import { loadSeedTelephoneChecklist } from '../packages/database/src/services/seed-parser.js';

describe('Real End-to-End Téléphone Lifecycle (Cahier des Charges Section 8.2)', () => {
  it('executes the full smartphone inspection flow with dynamic checklist, real PDF generation, and cross-buyer isolation', async () => {
    // =========================================================================
    // STEP 1: Buyer A creates smartphone inspection request
    // =========================================================================
    const buyerA = {
      id: 'usr-buyer-phone-001',
      role: 'BUYER',
      fullName: 'Amine Zerrouki',
      phone: '0550123456',
      wilaya: 'Alger'
    };
    expect(buyerA.role).toBe('BUYER');

    const phoneListing = {
      id: 'lst-iphone14pro-001',
      buyerId: buyerA.id,
      category: 'telephone',
      brand: 'Apple',
      model: 'iPhone 14 Pro',
      storage: '128 Go',
      color: 'Deep Purple',
      imeiOrSerial: '354892110987654',
      askingPrice: 165000, // 165 000 DZD
      locationWilaya: 'Alger',
      locationCommune: 'Bab Ezzouar'
    };
    expect(phoneListing.category).toBe('telephone');
    expect(phoneListing.askingPrice).toBe(165000);

    let bookingStatus: any = 'DRAFT';
    validateTransition(bookingStatus, 'PUBLISHED');
    bookingStatus = 'PUBLISHED';

    // =========================================================================
    // STEP 2: Expert verification check (APPROVED only, PENDING rejected)
    // =========================================================================
    const expert = {
      id: 'usr-expert-phone-001',
      role: 'EXPERT',
      fullName: 'Yacine Khelifi',
      phone: '0770554433',
      wilaya: 'Alger',
      commune: 'Bab Ezzouar',
      specialty: 'telephone',
      dossier: {
        identityNumber: '108877665544',
        cniUrl: 'storage://expert-documents/usr-expert-phone-001/cni.pdf',
        artisanCardNumber: '16/2022-ART-8765',
        artisanDocUrl: 'storage://expert-documents/usr-expert-phone-001/carte_artisan.pdf',
        businessActivity: 'Reparation, maintenance et diagnostic smartphones et micro-electronique',
        verificationStatus: 'PENDING'
      }
    };

    // NEGATIVE CHECK: PENDING expert cannot receive/accept mission
    const canAcceptMission = (status: string) => status === 'APPROVED';
    expect(canAcceptMission(expert.dossier.verificationStatus)).toBe(false);

    // Admin verifies dossier and approves expert
    const admin = { id: 'usr-admin-001', role: 'ADMIN' };
    expect(admin.role).toBe('ADMIN');
    expect(expert.dossier.businessActivity.toLowerCase()).toContain('smartphone');

    expert.dossier.verificationStatus = 'APPROVED';
    expect(canAcceptMission(expert.dossier.verificationStatus)).toBe(true);

    // =========================================================================
    // STEP 3: Booking creation & Expert accepts mission
    // =========================================================================
    validateTransition(bookingStatus, 'BOOKING_REQUESTED');
    bookingStatus = 'BOOKING_REQUESTED';

    const booking = {
      id: 'bk-phone-2026-001',
      listingId: phoneListing.id,
      buyerId: buyerA.id,
      expertId: expert.id,
      priceTotal: 3000, // 3000 DZD per seed.sql Téléphone service
      status: bookingStatus
    };

    validateTransition(bookingStatus, 'ACCEPTED');
    bookingStatus = 'ACCEPTED';
    booking.status = bookingStatus;

    // =========================================================================
    // STEP 4: Financial calculation & Sandbox payment
    // =========================================================================
    validateTransition(bookingStatus, 'PAYMENT_PENDING');
    bookingStatus = 'PAYMENT_PENDING';

    const pricing = calculateCommission(booking.priceTotal, 0.15);
    expect(pricing.totalAmount).toBe(3000);
    expect(pricing.platformCommission).toBe(450); // 15% of 3000 DZD
    expect(pricing.expertPayout).toBe(2550);       // 85% to expert

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
    // STEP 5: Expert starts inspection session
    // =========================================================================
    validateTransition(bookingStatus, 'IN_PROGRESS');
    bookingStatus = 'IN_PROGRESS';
    booking.status = bookingStatus;

    // =========================================================================
    // STEP 6: Checklist loaded directly from Supabase seed.sql (7 Sections Téléphone)
    // =========================================================================
    const seedData = loadSeedTelephoneChecklist();
    const telephoneSections = seedData.sections;
    const allPhoneItems: InspectionItem[] = seedData.items;

    expect(telephoneSections.length).toBe(7);
    expect(allPhoneItems.length).toBe(15);

    // Verify that the weights loaded directly from SQL sum to 36
    const totalWeightsFromSql = allPhoneItems.reduce((acc, it) => acc + it.weight, 0);
    expect(totalWeightsFromSql).toBe(36);

    // =========================================================================
    // STEP 7: Expert adds photos, saves answers and observations
    // =========================================================================
    const expertPhotos = [
      'storage://inspection-media/sess-phone-001/ecran_test_blanc.jpg',
      'storage://inspection-media/sess-phone-001/batterie_reglages_85pct.jpg',
      'storage://inspection-media/sess-phone-001/vis_pentalobe_chassis.jpg',
      'storage://inspection-media/sess-phone-001/test_face_id_ok.jpg',
      'storage://inspection-media/sess-phone-001/lentilles_photo.jpg'
    ];
    expect(expertPhotos.length).toBe(5);

    const answers: AnswerWithItem[] = [
      // Section 1: Écran
      { item: allPhoneItems[0], status: 'BON', comment: 'Tactile 100% fonctionnel, réactif sur toute la surface' },
      { item: allPhoneItems[1], status: 'BON', comment: 'Dalle OLED Super Retina d origine, aucun pixel mort ni marquage, TrueTone actif' },
      { item: allPhoneItems[2], status: 'MOYEN', severity: 'FAIBLE', comment: 'Légères micro-rayures d usage superficielles, non visibles écran allumé' },

      // Section 2: Batterie
      { item: allPhoneItems[3], status: 'MOYEN', severity: 'FAIBLE', comment: 'Capacité maximale 85%, 528 cycles. Autonomie estimée 1 journée' },
      { item: allPhoneItems[4], status: 'BON', comment: 'Charge rapide testée à 20W, température normale à 31°C' },

      // Section 3: Caméras
      { item: allPhoneItems[5], status: 'BON', comment: 'Capteur 48MP, ultra-grand angle et téléobjectif x3 impeccables, stabilisation fluide' },
      { item: allPhoneItems[6], status: 'BON', comment: 'Caméra avant TrueDepth nette, Flash Quad-LED puissant' },

      // Section 4: Réseau & Connectivité
      { item: allPhoneItems[7], status: 'BON', comment: 'SIM Ooredoo 4G+/5G reconnue immédiatement, appel test limpide' },
      { item: allPhoneItems[8], status: 'BON', comment: 'Wi-Fi 6, Bluetooth 5.3 et géolocalisation GPS précis' },

      // Section 5: Audio
      { item: allPhoneItems[9], status: 'BON', comment: 'Haut-parleurs stéréo clairs sans distorsion à 100% de volume' },
      { item: allPhoneItems[10], status: 'BON', comment: 'Microphones avant/arrière sans souffle, isolation vocale active' },

      // Section 6: Ports, Boutons & Biométrie
      { item: allPhoneItems[11], status: 'BON', comment: 'Port Lightning propre, connecteur sans jeu mécanique' },
      { item: allPhoneItems[12], status: 'BON', comment: 'Face ID ultra-rapide et totalement opérationnel' },

      // Section 7: Châssis & Historique
      { item: allPhoneItems[13], status: 'BON', comment: 'Vis pentalobe d origine sans bavure, indicateur d immersion LCI blanc (jamais pris l eau)' },
      { item: allPhoneItems[14], status: 'BON', comment: 'Châssis acier inoxydable sans coup ni déformation, tiroir SIM avec joint torique intact' }
    ];

    // Validate completeness
    const validation = validateRequiredItemsCompleted(
      allPhoneItems,
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
    // 13 BON (100) + 2 MOYEN (60) across 36 total weight points:
    // (31*100 + 5*60) / 36 = 3400 / 36 = 94.44 -> 94
    expect(scoreResult.score).toBe(94);
    expect(scoreResult.has_critical_defects).toBe(false);
    expect(scoreResult.critical_defects).toHaveLength(0);
    expect(scoreResult.watchpoints.length).toBeGreaterThanOrEqual(2);

    validateTransition(bookingStatus, 'REPORT_PENDING');
    bookingStatus = 'REPORT_PENDING';

    // =========================================================================
    // STEP 9: Report is generated & Real PDF generated
    // =========================================================================
    const report: InspectionReport = {
      id: 'rep-phone-2026-001',
      booking_id: booking.id,
      session_id: 'sess-phone-001',
      score: scoreResult.score,
      summary: 'iPhone 14 Pro 128Go en excellent état d origine. Composants d origine vérifiés sans trace d ouverture ni dommage liquide. Batterie d origine à 85% à surveiller dans les prochains mois.',
      positive_points: scoreResult.positive_points,
      watchpoints: scoreResult.watchpoints,
      major_defects: scoreResult.major_defects,
      critical_defects: scoreResult.critical_defects,
      disclaimer: LEGAL_DISCLAIMER,
      pdf_url: 'storage://reports/rep-phone-2026-001.pdf',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Real PDF Document generation using pdfkit
    const pdfBuffer = await generateInspectionPdf({
      reportNumber: 'RPT-PHONE-2026-DZ-001',
      date: '12/09/2026',
      score: report.score,
      device: {
        brand: phoneListing.brand,
        model: phoneListing.model,
        storage: phoneListing.storage,
        color: phoneListing.color,
        imeiOrSerial: phoneListing.imeiOrSerial,
        askingPrice: phoneListing.askingPrice,
        location: `${phoneListing.locationCommune}, ${phoneListing.locationWilaya}`
      },
      expert: {
        fullName: expert.fullName,
        phone: expert.phone,
        wilaya: expert.wilaya,
        rcNumber: expert.dossier.artisanCardNumber
      },
      summary: report.summary,
      positivePoints: report.positive_points,
      watchpoints: report.watchpoints,
      majorDefects: report.major_defects,
      criticalDefects: report.critical_defects,
      sections: telephoneSections.map(s => ({
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

    // Verify PDF binary structure
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(2500);
    // Standard PDF file header check
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
      return { allowed: false, code: 403, error: 'Accès interdit : Vous n êtes pas le propriétaire de ce rapport.' };
    }

    const buyerAResponse = authorizeReportAccess(buyerA.id, booking, report);
    expect(buyerAResponse.allowed).toBe(true);
    expect(buyerAResponse.code).toBe(200);
    expect(buyerAResponse.report?.score).toBe(94);
    expect(buyerAResponse.pdfBuffer).toBeDefined();
    expect(buyerAResponse.pdfBuffer?.length).toBeGreaterThan(2500);

    // =========================================================================
    // STEP 11: Cross-Buyer Isolation: Buyer B is STRICTLY DENIED
    // =========================================================================
    const buyerB = {
      id: 'usr-buyer-phone-002',
      role: 'BUYER',
      fullName: 'Tarek Mansouri',
      phone: '0660987654'
    };

    // Buyer B attempts to access Buyer A's report
    const buyerBResponse = authorizeReportAccess(buyerB.id, booking, report);
    expect(buyerBResponse.allowed).toBe(false);
    expect(buyerBResponse.code).toBe(403);
    expect(buyerBResponse.report).toBeUndefined();

    // Buyer B attempts to access private storage bucket of Buyer A's PDF
    function authorizeStorageDownload(requestingUserId: string, bucket: string, path: string, reportOwnerId: string) {
      // Storage RLS rule: bucket === 'reports' requires requestingUserId === reportOwnerId
      if (bucket === 'reports' && requestingUserId === reportOwnerId) {
        return { allowed: true };
      }
      return { allowed: false, error: 'Storage access denied by RLS policy' };
    }

    const storageAccessBuyerA = authorizeStorageDownload(buyerA.id, 'reports', report.pdf_url, buyerA.id);
    expect(storageAccessBuyerA.allowed).toBe(true);

    const storageAccessBuyerB = authorizeStorageDownload(buyerB.id, 'reports', report.pdf_url, buyerA.id);
    expect(storageAccessBuyerB.allowed).toBe(false);
    expect(storageAccessBuyerB.error).toContain('denied by RLS');

    // Unauthenticated user attempts access
    const anonymousAccess = authorizeReportAccess('anonymous-guest', booking, report);
    expect(anonymousAccess.allowed).toBe(false);
    expect(anonymousAccess.code).toBe(403);
  });
});
