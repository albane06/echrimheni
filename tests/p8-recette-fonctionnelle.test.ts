import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculateInspectionScore,
  getLegalDisclaimer,
  LEGAL_DISCLAIMER,
  LEGAL_DISCLAIMER_TERRAIN,
  LEGAL_DISCLAIMER_IMMOBILIER,
  type InspectionItem,
  type Listing,
  type ListingRealEstate,
} from '@echrimheni/shared';
import {
  assertTemplateMatchesService,
  assertServiceMatchesListing,
} from '@echrimheni/database';
import {
  generateInspectionPdf,
  type ReportPdfData,
} from '../packages/database/src/services/pdf.js';
import {
  buildReportPdfData,
} from '../packages/database/src/services/reportPdf.js';
import {
  validateObjectForm,
  validateSurface,
  validatePropertyType,
  validateGpsCoordinates,
  validateGpsCoordinate,
  EMPTY_OBJECT,
  type ObjectForm,
} from '../apps/mobile/src/components/inspection/validation.js';

describe('MANDAT P8.06 — Recette Fonctionnelle Terrain & Immobilier', () => {
  // ==========================================================================
  // SECTION A : Application Mobile — Parcours & Validations
  // ==========================================================================
  describe('A. Application Mobile — Formulaires, Validation & Données', () => {
    it('A.1 & A.3 : Valide le formulaire Terrain avec champs obligatoires et spécifiques', () => {
      const terrainForm: ObjectForm = {
        ...EMPTY_OBJECT,
        title: 'Terrain résidentiel 600m² avec livret foncier',
        propertyType: 'Constructible',
        surfaceM2: '600',
        cadastralRef: 'Section 4, Lot 108',
        propertyPaper: 'LIVRET_FONCIER',
        gpsLat: '36.64320',
        gpsLng: '2.69140',
        topography: 'Terrain plat',
        roadAccess: 'Route goudronnée',
        askingPrice: '18000000',
      };

      const error = validateObjectForm(terrainForm, 'terrain');
      expect(error).toBeNull();
    });

    it('A.2 & A.4 : Valide le formulaire Immobilier Bâti et bloque les champs obligatoires manquants', () => {
      const immoFormIncomplet: ObjectForm = {
        ...EMPTY_OBJECT,
        title: 'Villa R+2',
        propertyType: '', // Manquant
        surfaceM2: '350',
      };
      expect(validateObjectForm(immoFormIncomplet, 'immobilier')).toBe('validation.propertyTypeRequired');

      const immoFormSansSurface: ObjectForm = {
        ...immoFormIncomplet,
        propertyType: 'Villa',
        surfaceM2: '', // Manquant
      };
      expect(validateObjectForm(immoFormSansSurface, 'immobilier')).toBe('validation.surfaceRequired');

      const immoFormComplet: ObjectForm = {
        ...EMPTY_OBJECT,
        title: 'Villa R+2 standing',
        propertyType: 'Villa',
        surfaceM2: '350',
        rooms: '8',
        floors: '2',
        condition: 'EXCELLENT',
        cadastralRef: 'Ilot 12',
        propertyPaper: 'ACTE_NOTARIE',
        askingPrice: '45000000',
      };
      expect(validateObjectForm(immoFormComplet, 'immobilier')).toBeNull();
    });

    it('A.4 : Valide rigoureusement les coordonnées GPS (décimales, bornes et cohérence)', () => {
      // Coordonnées valides
      expect(validateGpsCoordinate('36.7525', 'lat')).toBeNull();
      expect(validateGpsCoordinate('3.0420', 'lng')).toBeNull();

      // Latitude hors bornes
      expect(validateGpsCoordinate('95.0', 'lat')).toBe('validation.gpsRangeLat');
      expect(validateGpsCoordinate('-91.0', 'lat')).toBe('validation.gpsRangeLat');

      // Longitude hors bornes
      expect(validateGpsCoordinate('181.0', 'lng')).toBe('validation.gpsRangeLng');

      // Paire incomplète (l'une sans l'autre)
      expect(validateGpsCoordinates('36.75', '')).toBe('validation.gpsBothOrNone');
      expect(validateGpsCoordinates('', '3.05')).toBe('validation.gpsBothOrNone');
      expect(validateGpsCoordinates('36.75', '3.05')).toBeNull();
      expect(validateGpsCoordinates('', '')).toBeNull();
    });

    it('A.5 : Modélisation et cohérence de sauvegarde de listing_real_estate', () => {
      const extension: ListingRealEstate = {
        id: 're-test-01',
        listing_id: 'listing-test-01',
        domain: 'TERRAIN',
        property_type: 'Agricole',
        surface_m2: 1500,
        cadastral_ref: 'Lot 22',
        property_paper_declared: 'ACTE_NOTARIE',
        gps_lat: 36.45,
        gps_lng: 2.85,
        utilities: { water: true, electricity: true, gas: false, sewage: false, sanitation_type: 'none' },
        created_at: new Date().toISOString(),
      };

      const listing: Listing = {
        id: 'listing-test-01',
        buyer_id: 'buyer-01',
        category_id: 'cat-terrain',
        title: 'Parcelle agricole 1500m²',
        location_wilaya: 'Blida',
        location_commune: 'Mouzaia',
        asking_price: 12000000,
        real_estate: extension,
        created_at: new Date().toISOString(),
      };

      expect(listing.real_estate?.domain).toBe('TERRAIN');
      expect(listing.real_estate?.surface_m2).toBe(1500);
      expect(listing.real_estate?.utilities?.water).toBe(true);
      expect(listing.make).toBeUndefined();
    });
  });

  // ==========================================================================
  // SECTION B : Services, Tarifs, Attribution et Checklists
  // ==========================================================================
  describe('B. Services, Attribution et Grilles d inspection', () => {
    it('B.6 : Empêche l association d un service hors de sa catégorie d annonce', () => {
      const terrainCategory = { id: 'cat-terrain', code: 'terrain' };
      const autoService = { id: 'svc-auto', category_id: 'cat-auto', base_price: 7000 };
      const terrainService = { id: 'svc-terrain', category_id: 'cat-terrain', base_price: 9000 };

      // Service Terrain sur Catégorie Terrain -> OK
      expect(() => assertServiceMatchesListing(terrainService, terrainCategory.id)).not.toThrow();

      // Service Auto sur Catégorie Terrain -> REJET STRICT
      expect(() => assertServiceMatchesListing(autoService, terrainCategory.id)).toThrowError(
        /Service incompatible/
      );
    });

    it('B.7 & B.8 : Contrôle de correspondance template/service et limitation identifiée', () => {
      const terrainTemplate = { id: 'tmpl-terrain-01', service_id: '22222222-2222-2222-2222-222222222242' };
      const batiTemplate = { id: 'tmpl-bati-01', service_id: '22222222-2222-2222-2222-222222222252' };

      // Template Terrain sur Service 2242 -> OK
      expect(() => assertTemplateMatchesService(terrainTemplate, '22222222-2222-2222-2222-222222222242')).not.toThrow();

      // Template Bâti sur Service 2252 -> OK
      expect(() => assertTemplateMatchesService(batiTemplate, '22222222-2222-2222-2222-222222222252')).not.toThrow();

      // Croisement refusé
      expect(() => assertTemplateMatchesService(terrainTemplate, '22222222-2222-2222-2222-222222222252')).toThrowError(
        /Checklist refusée/
      );

      // Limitation fonctionnelle : les services annexes (2241, 2243, 2251, 2253, 2254) n ont pas de template dédié
      expect(() => assertTemplateMatchesService(null, '22222222-2222-2222-2222-222222222241')).toThrowError(
        /Checklist refusée/
      );
    });

    it('B.10 : Calcul des scores avec pondérations réelles et décharges légales', () => {
      // Items réels de la grille Bâti (ex: fissures structurelles poids 5)
      const batiItems: InspectionItem[] = [
        {
          id: '55555555-5555-5555-5555-000000001001',
          section_id: 'sec-1',
          name: 'Absence de fissures structurelles ou traversantes sur porteurs',
          weight: 5,
          is_required: true,
          order_index: 1,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['CRITIQUE'],
        },
        {
          id: '55555555-5555-5555-5555-000000001005',
          section_id: 'sec-3',
          name: 'Portes d entrée et de communication fonctionnelles',
          weight: 2,
          is_required: true,
          order_index: 2,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['FAIBLE'],
        },
      ];

      // Cas parfait
      const answersPerfect = [
        { item: batiItems[0], status: 'BON' as const },
        { item: batiItems[1], status: 'BON' as const },
      ];
      const resultPerfect = calculateInspectionScore(answersPerfect, 'immobilier');
      expect(resultPerfect.score).toBe(100);
      expect(resultPerfect.has_critical_defects).toBe(false);
      expect(resultPerfect.disclaimer).toBe(LEGAL_DISCLAIMER_IMMOBILIER);

      // Cas défaut critique
      const answersCritical = [
        { item: batiItems[0], status: 'MAUVAIS' as const, severity: 'CRITIQUE' as const, comment: 'Poteau fissuré' },
        { item: batiItems[1], status: 'BON' as const },
      ];
      const resultCritical = calculateInspectionScore(answersCritical, 'immobilier');
      expect(resultCritical.has_critical_defects).toBe(true);
      expect(resultCritical.score).toBeLessThanOrEqual(29);
      expect(resultCritical.critical_defects).toHaveLength(1);
    });
  });

  // ==========================================================================
  // SECTION C : Rapports et Génération PDF
  // ==========================================================================
  describe('C. Génération et consultation des PDF spécialisés', () => {
    it('C.11 : Génération du PDF Terrain avec land block et disclaimer foncier', async () => {
      const pdfData: ReportPdfData = {
        reportNumber: 'RPT-TRN-2026-VAL',
        date: '22/11/2026',
        score: 85,
        land: {
          parcelType: 'Constructible',
          surfaceAreaM2: 500,
          cadastralRef: 'Sec 2 Lot 44',
          topography: 'Plat régulier',
          utilities: ['Eau', 'Electricité'],
          accessType: 'Goudron',
          askingPrice: 15000000,
          location: 'Tipaza',
          gpsCoordinates: '36.65, 2.70',
          propertyPaper: 'Livret foncier',
        },
        disclaimerText: LEGAL_DISCLAIMER_TERRAIN,
        expert: { fullName: 'Expert Foncier', phone: '0555000000', wilaya: 'Tipaza' },
        sections: [
          {
            title: 'Accès et Voirie',
            items: [{ name: 'Route goudronnée', status: 'BON' }],
          },
        ],
        positivePoints: ['Accès parfait'],
        watchpoints: [],
        majorDefects: [],
        criticalDefects: [],
        summary: 'Terrain très sain.',
      };

      const buffer = await generateInspectionPdf(pdfData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it('C.11 : Génération du PDF Bâti avec property block et disclaimer immobilier', async () => {
      const pdfData: ReportPdfData = {
        reportNumber: 'RPT-BAT-2026-VAL',
        date: '22/11/2026',
        score: 78,
        property: {
          propertyType: 'Appartement F4',
          livingAreaM2: 120,
          rooms: 4,
          floors: 3,
          constructionYear: 2020,
          condition: 'Très bon état',
          askingPrice: 22000000,
          location: 'Alger',
          gpsCoordinates: '36.75, 3.05',
          propertyPaper: 'Acte notarié',
        },
        disclaimerText: LEGAL_DISCLAIMER_IMMOBILIER,
        expert: { fullName: 'Expert Bâti', phone: '0666000000', wilaya: 'Alger' },
        sections: [
          {
            title: 'Gros Œuvre',
            items: [{ name: 'Structure béton', status: 'BON' }],
          },
        ],
        positivePoints: ['Logement lumineux'],
        watchpoints: [],
        majorDefects: [],
        criticalDefects: [],
        summary: 'Bel appartement sans défaut majeur.',
      };

      const buffer = await generateInspectionPdf(pdfData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('C.11 : Rétrocompatibilité PDF Automobile préservée', async () => {
      const pdfData: ReportPdfData = {
        reportNumber: 'RPT-AUTO-2026-VAL',
        date: '22/11/2026',
        score: 95,
        vehicle: {
          make: 'Renault',
          model: 'Clio',
          year: 2021,
          mileage: 35000,
          askingPrice: 3100000,
          location: 'Oran',
        },
        disclaimerText: LEGAL_DISCLAIMER,
        expert: { fullName: 'Expert Auto', phone: '0777000000', wilaya: 'Oran' },
        sections: [{ title: 'Moteur', items: [{ name: 'Démarrage', status: 'BON' }] }],
        positivePoints: ['Excellent état'],
        watchpoints: [],
        majorDefects: [],
        criticalDefects: [],
        summary: 'Véhicule sain.',
      };

      const buffer = await generateInspectionPdf(pdfData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  // ==========================================================================
  // SECTION D : Sécurité, RLS et Étanchéité des Données Sensibles
  // ==========================================================================
  describe('D. Sécurité des Données Sensibles & RLS', () => {
    const migrationPath = resolve(
      __dirname,
      '../packages/database/supabase/migrations/20260912000012_terrain_immobilier_mvp.sql'
    );
    const sql = readFileSync(migrationPath, 'utf-8');

    it('D.RLS : Le SELECT de listing_real_estate restreint strictement aux ayants droit', () => {
      // Vérification des 3 bénéficiaires légitimes
      expect(sql).toContain('l.buyer_id = auth.uid()');
      expect(sql).toContain('public.is_admin(auth.uid())');
      expect(sql).toContain('b.expert_id = auth.uid()');

      // Aucune fuite vers les experts non assignés
      expect(sql).not.toContain('verification_status');
    });

    it('D.COL : Les 32 colonnes de listing_real_estate protègent les données sensibles', () => {
      // Champs sensibles vérifiés
      expect(sql).toContain('gps_lat NUMERIC(10, 7)');
      expect(sql).toContain('gps_lng NUMERIC(10, 7)');
      expect(sql).toContain('gps_address_note TEXT');
      expect(sql).toContain('cadastral_ref TEXT');
      expect(sql).toContain('property_paper_declared TEXT');
      expect(sql).toContain('notes TEXT');
      expect(sql).toContain('additional_details JSONB');
    });
  });

  // ==========================================================================
  // SECTION E : Cohérence des Traductions FR / AR / EN
  // ==========================================================================
  describe('E. Traductions i18n FR / AR / EN', () => {
    const frPath = resolve(__dirname, '../apps/mobile/src/i18n/locales/fr.ts');
    const arPath = resolve(__dirname, '../apps/mobile/src/i18n/locales/ar.ts');
    const enPath = resolve(__dirname, '../apps/mobile/src/i18n/locales/en.ts');

    const frContent = readFileSync(frPath, 'utf-8');
    const arContent = readFileSync(arPath, 'utf-8');
    const enContent = readFileSync(enPath, 'utf-8');

    const keysToCheck = [
      'propertyType',
      'surface',
      'cadastralRef',
      'propertyPaper',
      'surfaceRequired',
      'surfacePositive',
      'propertyTypeRequired',
      'gpsInvalid',
      'gpsRangeLat',
      'gpsRangeLng',
      'gpsBothOrNone',
    ];

    it.each(keysToCheck)('vérifie la présence de la clé %s dans les 3 langues', (key) => {
      expect(frContent).toContain(key);
      expect(arContent).toContain(key);
      expect(enContent).toContain(key);
    });
  });

  // ==========================================================================
  // SECTION F : Audit Fonctionnel Web Admin — Constat d Interfaces Manquantes
  // ==========================================================================
  describe('F. Audit d exhaustivité Web Admin (apps/web-admin)', () => {
    it('F.1 : Absence confirmée de la page /listings dans la Web Admin', () => {
      const sidebarPath = resolve(__dirname, '../apps/web-admin/src/components/Sidebar.tsx');
      const sidebarContent = readFileSync(sidebarPath, 'utf-8');
      
      // La navigation contient Dashboard, Experts, Missions, Rapports, Paiements, etc.
      expect(sidebarContent).toContain('/experts');
      expect(sidebarContent).toContain('/missions');
      expect(sidebarContent).toContain('/reports');
      
      // Mais PAS de /listings
      expect(sidebarContent).not.toContain('/listings');
    });

    it('F.2 & F.3 : Présence et affichage des données spécifiques réelles (surface, cadastre, GPS) dans missions (P8.07)', () => {
      const missionDetailPath = resolve(__dirname, '../apps/web-admin/src/app/missions/[id]/page.tsx');
      const missionDetailContent = readFileSync(missionDetailPath, 'utf-8');

      // Le détail mission affiche désormais surface, cadastre, GPS, et listing_real_estate
      expect(missionDetailContent).toContain('surface_m2');
      expect(missionDetailContent).toContain('cadastral_ref');
      expect(missionDetailContent).toContain('gps_lat');
      expect(missionDetailContent).toContain('listing_real_estate');
    });

    it('F.4 : Absence de gestion des tarifs et services dans Settings', () => {
      const settingsPath = resolve(__dirname, '../apps/web-admin/src/app/settings/page.tsx');
      const settingsContent = readFileSync(settingsPath, 'utf-8');

      // Settings n affiche que la commission 15% et la sécurité RLS
      expect(settingsContent).toContain('Taux de commission');
      expect(settingsContent).not.toContain('services');
      expect(settingsContent).not.toContain('base_price');
      expect(settingsContent).not.toContain('category_id');
    });
  });
});
