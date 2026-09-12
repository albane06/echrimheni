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
} from '../packages/shared/src/index.js';

async function runE2EDemo() {
  console.log('================================================================');
  console.log('  ECHRIMHENI MVP v1.0 - SPRINT 1 AUTOMOBILE END-TO-END DEMO');
  console.log('================================================================\n');

  console.log('>> ETAPE 1 : Le Buyer cree une demande d inspection automobile');
  const listing = {
    id: 'list-dz-01',
    buyer_id: 'buyer-sofiane',
    category: 'Automobile',
    make: 'Volkswagen',
    model: 'Golf 7 GTD',
    year: 2018,
    mileage: 142000,
    asking_price: 4200000,
    location: 'Bab Ezzouar, Alger',
    photos: ['https://storage.echrimheni.dz/listings/golf7-front.jpg']
  };
  console.log('  [OK] Demande creee : ' + listing.make + ' ' + listing.model + ' (' + listing.year + ') a ' + listing.location);
  let bookingStatus = 'DRAFT' as any;
  validateTransition(bookingStatus, 'PUBLISHED');
  bookingStatus = 'PUBLISHED';
  console.log('  [STATUS] -> ' + bookingStatus + '\n');

  console.log('>> ETAPE 2 : Le Buyer selectionne un expert verifie');
  const expert = {
    id: 'exp-karim',
    name: 'Karim Benali',
    specialty: 'Automobile',
    wilaya: 'Alger',
    verification_status: 'APPROVED',
    rating: 4.85
  };
  console.log('  [EXPERT] Selectionne : ' + expert.name + ' (' + expert.specialty + ' - ' + expert.wilaya + ') [Note ' + expert.rating + '/5]');
  validateTransition(bookingStatus, 'BOOKING_REQUESTED');
  bookingStatus = 'BOOKING_REQUESTED';
  console.log('  [STATUS] -> ' + bookingStatus + '\n');

  console.log('>> ETAPE 3 : L expert examine et accepte la mission');
  validateTransition(bookingStatus, 'ACCEPTED');
  bookingStatus = 'ACCEPTED';
  console.log('  [STATUS] -> ' + bookingStatus + '\n');

  console.log('>> ETAPE 4 : Calcul financier & Paiement Sandbox');
  const inspectionPrice = 7000;
  const pricing = calculateCommission(inspectionPrice, 0.15);
  console.log('  [PRICING] Montant client : ' + pricing.totalAmount + ' DZD');
  console.log('  [PRICING] Commission plateforme (15%) : ' + pricing.platformCommission + ' DZD');
  console.log('  [PRICING] Montant expert : ' + pricing.expertPayout + ' DZD');

  validateTransition(bookingStatus, 'PAYMENT_PENDING');
  bookingStatus = 'PAYMENT_PENDING';

  const paymentService = new PaymentService(new MockPaymentProvider(false));
  const payment = await paymentService.pay('book-auto-01', pricing.totalAmount, 'SANDBOX');
  console.log('  [PAYMENT] ' + payment.message + ' (Ref: ' + payment.transactionRef + ')');

  validateTransition(bookingStatus, 'PAID');
  bookingStatus = 'PAID';
  validateTransition(bookingStatus, 'SCHEDULED');
  bookingStatus = 'SCHEDULED';
  console.log('  [STATUS] -> ' + bookingStatus + '\n');

  console.log('>> ETAPE 5 : L expert arrive sur place et demarre l inspection');
  validateTransition(bookingStatus, 'IN_PROGRESS');
  bookingStatus = 'IN_PROGRESS';
  console.log('  [STATUS] -> ' + bookingStatus + '\n');

  console.log('>> ETAPE 6 : Remplissage de la grille dynamique (7 blocs automobile)');
  const checklistItems: InspectionItem[] = [
    { id: '1', section_id: 's1', name: 'Moteur & Demarrage', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '2', section_id: 's1', name: 'Absence de fumee suspecte', weight: 3, is_required: true, order_index: 2, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '3', section_id: 's2', name: 'Freinage & Plaquettes', weight: 2, is_required: true, order_index: 3, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '4', section_id: 's3', name: 'Suspension & Direction', weight: 2, is_required: true, order_index: 4, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '5', section_id: 's4', name: 'Carrosserie (Pas de marbre/choc)', weight: 3, is_required: true, order_index: 5, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '6', section_id: 's5', name: 'Pneumatiques (Usure reguliere)', weight: 2, is_required: true, order_index: 6, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '7', section_id: 's6', name: 'Electronique & Diagnostic OBD', weight: 3, is_required: true, order_index: 7, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] },
    { id: '8', section_id: 's7', name: 'Interieur & Ceintures', weight: 1, is_required: true, order_index: 8, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] }
  ];

  const expertAnswers: AnswerWithItem[] = [
    { item: checklistItems[0], status: 'BON', comment: 'Demarrage instantane, ralenti stable' },
    { item: checklistItems[1], status: 'BON', comment: 'Gaz d echappement clairs' },
    { item: checklistItems[2], status: 'MOYEN', severity: 'FAIBLE', comment: 'Plaquettes avant a prevoir d ici 5000 km' },
    { item: checklistItems[3], status: 'BON', comment: 'Amortisseurs d origine en bon etat' },
    { item: checklistItems[4], status: 'BON', comment: 'Peinture d origine mesuree, longerons intacts' },
    { item: checklistItems[5], status: 'BON', comment: 'Pneus Michelin 80% restants' },
    { item: checklistItems[6], status: 'BON', comment: 'Scan OBD 0 code defaut actif' },
    { item: checklistItems[7], status: 'BON', comment: 'Habitacle soigne, non-fumeur' }
  ];

  const validation = validateRequiredItemsCompleted(checklistItems, expertAnswers.map(a => ({ item_id: a.item.id, status: a.status })));
  console.log('  [CHECKLIST] Validation des ' + checklistItems.length + ' points obligatoires : ' + (validation.isValid ? 'VALIDE' : 'ERREUR'));

  validateTransition(bookingStatus, 'INSPECTION_COMPLETED');
  bookingStatus = 'INSPECTION_COMPLETED';

  console.log('\n>> ETAPE 7 : Moteur de scoring');
  const scoring = calculateInspectionScore(expertAnswers);
  console.log('  [SCORE] Score Global Indicatif : ' + scoring.score + ' / 100');
  console.log('  [SCORE] Points positifs releves : ' + scoring.positive_points.length);
  console.log('  [SCORE] Points a surveiller : ' + scoring.watchpoints.length);
  console.log('  [SCORE] Presence defauts critiques : ' + (scoring.has_critical_defects ? 'OUI' : 'NON'));

  validateTransition(bookingStatus, 'REPORT_PENDING');
  bookingStatus = 'REPORT_PENDING';

  console.log('\n>> ETAPE 8 : Generation du Rapport d Inspection Officiel');
  const report: InspectionReport = {
    id: 'rep-auto-01',
    booking_id: 'book-auto-01',
    session_id: 'sess-auto-01',
    score: scoring.score,
    summary: 'Vehicule sain et bien entretenu. Mecanique et structure conformes aux standards.',
    positive_points: scoring.positive_points,
    watchpoints: scoring.watchpoints,
    major_defects: scoring.major_defects,
    critical_defects: scoring.critical_defects,
    disclaimer: LEGAL_DISCLAIMER,
    pdf_url: 'https://storage.echrimheni.dz/reports/rep-auto-01.pdf',
    is_published: true,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  validateTransition(bookingStatus, 'REPORT_READY');
  bookingStatus = 'REPORT_READY';
  console.log('  [REPORT] Redige et signe par : ' + expert.name);
  console.log('  [REPORT] URL export PDF : ' + report.pdf_url);
  console.log('  [REPORT] Disclaimer legal insere : ' + report.disclaimer.slice(0, 80) + '...');

  console.log('\n>> ETAPE 9 : Le Buyer consulte son rapport complet dans l application');
  console.log('  [BUYER] Consultation du score (' + report.score + '/100) et des observations reussie.');
  validateTransition(bookingStatus, 'COMPLETED');
  bookingStatus = 'COMPLETED';
  console.log('  [STATUS] -> ' + bookingStatus);

  console.log('\n================================================================');
  console.log('  SUCCES : PARCOURS AUTOMOBILE VERTICAL SLICE COMPLET VALIDE !');
  console.log('================================================================\n');
}

runE2EDemo().catch(console.error);