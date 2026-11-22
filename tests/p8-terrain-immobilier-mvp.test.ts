import { describe, it, expect, vi } from 'vitest';
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

describe('MANDAT P8.05-B — Terrain & Immobilier MVP Test Suite', () => {
  // --------------------------------------------------------------------------
  // TEST 1 : Création d'une annonce foncière (Terrain) avec champs requis et GPS
  // --------------------------------------------------------------------------
  it('1. should construct a valid Terrain listing data object with real estate extension', () => {
    const terrainExtension: ListingRealEstate = {
      id: 're-terrain-001',
      listing_id: 'listing-terrain-001',
      domain: 'TERRAIN',
      property_type: 'CONSTRUCTIBLE',
      surface_m2: 450,
      cadastralRef: 'Section B, Lot 14',
      property_paper_declared: 'LIVRET_FONCIER',
      gps_lat: 36.7525,
      gps_lng: 3.0420,
      utilities: {
        electricity: true,
        water: true,
        gas: false,
        sewage: true,
        internet: false,
      },
      topography: 'Plat',
      road_access: 'Route goudronnée',
      boundary_fenced: true,
      created_at: new Date().toISOString(),
    };

    const terrainListing: Listing = {
      id: 'listing-terrain-001',
      buyer_id: 'buyer-001',
      category_id: 'cat-terrain-id',
      title: 'Terrain résidentiel 450m² vue dégagée',
      asking_price: 15000000,
      location_wilaya: 'Tipaza',
      location_commune: 'Cherchell',
      description: 'Superbe terrain viabilisé prêt à bâtir avec acte et livret foncier.',
      photos: ['https://example.com/terrain1.jpg'],
      source_platform: 'ECHRI',
      real_estate: terrainExtension,
      created_at: new Date().toISOString(),
    };

    expect(terrainListing.id).toBe('listing-terrain-001');
    expect(terrainListing.real_estate?.domain).toBe('TERRAIN');
    expect(terrainListing.real_estate?.surface_m2).toBe(450);
    expect(terrainListing.real_estate?.property_type).toBe('CONSTRUCTIBLE');
    expect(terrainListing.real_estate?.gps_lat).toBeCloseTo(36.7525);
    expect(terrainListing.real_estate?.gps_lng).toBeCloseTo(3.0420);
    expect(terrainListing.real_estate?.utilities?.electricity).toBe(true);
    expect(terrainListing.make).toBeUndefined();
    expect(terrainListing.model).toBeUndefined();
    expect(terrainListing.year).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // TEST 2 : Création d'une annonce immobilière bâtie (Appartement/Villa)
  // --------------------------------------------------------------------------
  it('2. should construct a valid Immobilier Bâti listing data object with rooms, surface, floors', () => {
    const batiExtension: ListingRealEstate = {
      id: 're-bati-001',
      listing_id: 'listing-bati-001',
      domain: 'IMMOBILIER',
      property_type: 'APPARTEMENT',
      surface_m2: 125,
      rooms: 4,
      floors: 3,
      construction_year: 2021,
      condition: 'EXCELLENT',
      has_elevator: true,
      parking_spaces: 1,
      property_paper_declared: 'ACTE_NOTARIE',
      gps_lat: 36.7210,
      gps_lng: 3.1850,
      created_at: new Date().toISOString(),
    };

    const batiListing: Listing = {
      id: 'listing-bati-001',
      buyer_id: 'buyer-002',
      category_id: 'cat-immo-id',
      title: 'Appartement F4 haut standing 125m²',
      asking_price: 26000000,
      location_wilaya: 'Alger',
      location_commune: 'Bab Ezzouar',
      description: 'F4 moderne 3ème étage avec ascenseur, place de parking et acte notarié.',
      photos: ['https://example.com/immo1.jpg'],
      source_platform: 'OUEDKNISS',
      listing_url: 'https://ouedkniss.com/annonce/12345',
      real_estate: batiExtension,
      created_at: new Date().toISOString(),
    };

    expect(batiListing.real_estate?.domain).toBe('IMMOBILIER');
    expect(batiListing.real_estate?.property_type).toBe('APPARTEMENT');
    expect(batiListing.real_estate?.surface_m2).toBe(125);
    expect(batiListing.real_estate?.rooms).toBe(4);
    expect(batiListing.real_estate?.floors).toBe(3);
    expect(batiListing.real_estate?.has_elevator).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 3 : Rétrocompatibilité : annonce automobile / bien mobilier traditionnel
  // --------------------------------------------------------------------------
  it('3. should preserve 100% backward compatibility for Automobile / mobile goods listings', () => {
    const autoListing: Listing = {
      id: 'listing-auto-001',
      buyer_id: 'buyer-003',
      category_id: 'cat-auto-id',
      title: 'Renault Clio 5 - 2021',
      make: 'Renault',
      model: 'Clio 5',
      year: 2021,
      mileage: 45000,
      asking_price: 3200000,
      location_wilaya: 'Oran',
      location_commune: 'Es Senia',
      description: 'Première main entretien maison.',
      photos: [],
      source_platform: 'ECHRI',
      created_at: new Date().toISOString(),
    };

    expect(autoListing.make).toBe('Renault');
    expect(autoListing.model).toBe('Clio 5');
    expect(autoListing.year).toBe(2021);
    expect(autoListing.mileage).toBe(45000);
    expect(autoListing.real_estate).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // TEST 4 : Validation des champs obligatoires vs optionnels selon le domaine
  // --------------------------------------------------------------------------
  describe('4. Contextual validation by domain', () => {
    it('validates terrain form: surface and propertyType required, make/model/year not checked', () => {
      const incompleteTerrain: ObjectForm = {
        ...EMPTY_OBJECT,
        title: 'Terrain Cherchell',
        propertyType: '',
        surfaceM2: '',
      };
      expect(validateObjectForm(incompleteTerrain, 'terrain')).toBe('validation.propertyTypeRequired');

      const missingSurface: ObjectForm = {
        ...incompleteTerrain,
        propertyType: 'Constructible',
        surfaceM2: '',
      };
      expect(validateObjectForm(missingSurface, 'terrain')).toBe('validation.surfaceRequired');

      const validTerrain: ObjectForm = {
        ...incompleteTerrain,
        propertyType: 'Constructible',
        surfaceM2: '500',
        askingPrice: '12000000',
      };
      expect(validateObjectForm(validTerrain, 'terrain')).toBeNull();
    });

    it('validates immobilier form: surface and propertyType required, rooms/floors optional', () => {
      const incompleteImmo: ObjectForm = {
        ...EMPTY_OBJECT,
        title: 'Villa Bab Ezzouar',
        propertyType: '',
        surfaceM2: '',
      };
      expect(validateObjectForm(incompleteImmo, 'immobilier')).toBe('validation.propertyTypeRequired');

      const validImmo: ObjectForm = {
        ...incompleteImmo,
        propertyType: 'Villa',
        surfaceM2: '280',
        rooms: '6',
        floors: '2',
      };
      expect(validateObjectForm(validImmo, 'immobilier')).toBeNull();
    });

    it('validates automobile form: make, model, year, mileage required (not surface)', () => {
      const incompleteAuto: ObjectForm = {
        ...EMPTY_OBJECT,
        title: 'Peugeot 208',
        make: '',
        model: '',
        year: '',
      };
      expect(validateObjectForm(incompleteAuto, 'automobile')).toBe('validation.brandRequired');

      const validAuto: ObjectForm = {
        ...incompleteAuto,
        make: 'Peugeot',
        model: '208',
        year: '2020',
        mileage: '60000',
      };
      expect(validateObjectForm(validAuto, 'automobile')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // TEST 5 : Validation des coordonnées GPS
  // --------------------------------------------------------------------------
  describe('5. GPS coordinate validation', () => {
    it('validates GPS decimal ranges correctly', () => {
      expect(validateGpsCoordinate('36.7525', 'lat')).toBeNull();
      expect(validateGpsCoordinate('3.0420', 'lng')).toBeNull();
      expect(validateGpsCoordinate('-33.8688', 'lat')).toBeNull();
      expect(validateGpsCoordinate('151.2093', 'lng')).toBeNull();

      // Invalid range
      expect(validateGpsCoordinate('95.0', 'lat')).toBe('validation.gpsRangeLat');
      expect(validateGpsCoordinate('-91.5', 'lat')).toBe('validation.gpsRangeLat');
      expect(validateGpsCoordinate('185.0', 'lng')).toBe('validation.gpsRangeLng');
      expect(validateGpsCoordinate('-181.0', 'lng')).toBe('validation.gpsRangeLng');

      // Invalid syntax
      expect(validateGpsCoordinate('abc', 'lat')).toBe('validation.gpsInvalid');
    });

    it('validates coordinate pair completeness (both or none)', () => {
      expect(validateGpsCoordinates('', '')).toBeNull();
      expect(validateGpsCoordinates('36.75', '3.05')).toBeNull();
      expect(validateGpsCoordinates('36.75', '')).toBe('validation.gpsBothOrNone');
      expect(validateGpsCoordinates('', '3.05')).toBe('validation.gpsBothOrNone');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 6 : Grilles d'inspection : structure et pondérations
  // --------------------------------------------------------------------------
  describe('6. Inspection checklist template structure & weighting', () => {
    it('verifies items have positive weights and critical items have strong weighting', () => {
      const terrainChecklistItems: InspectionItem[] = [
        {
          id: 'item-t-1',
          section_id: 'sec-t-1',
          name: 'Bornage apparent et limites visuelles',
          weight: 3,
          is_required: true,
          order_index: 1,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'],
        },
        {
          id: 'item-t-2',
          section_id: 'sec-t-2',
          name: 'Raccordement électrique et compteur',
          weight: 2,
          is_required: true,
          order_index: 2,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT'],
        },
        {
          id: 'item-t-3',
          section_id: 'sec-t-3',
          name: 'Risque géologique / Glissement de terrain',
          weight: 4,
          is_required: true,
          order_index: 3,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['IMPORTANT', 'CRITIQUE'],
        },
      ];

      for (const item of terrainChecklistItems) {
        expect(item.weight).toBeGreaterThan(0);
        expect(item.possible_statuses).toContain('BON');
        expect(item.possible_statuses).toContain('MAUVAIS');
      }

      const totalWeight = terrainChecklistItems.reduce((acc, it) => acc + it.weight, 0);
      expect(totalWeight).toBe(9);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 7 : Moteur de scoring dynamique adapté
  // --------------------------------------------------------------------------
  describe('7. Domain-adapted scoring engine', () => {
    it('calculates perfect score and attaches terrain legal disclaimer', () => {
      const items: InspectionItem[] = [
        {
          id: 't-1',
          section_id: 's-1',
          name: 'Accessibilité voirie',
          weight: 2,
          is_required: true,
          order_index: 1,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['FAIBLE'],
        },
        {
          id: 't-2',
          section_id: 's-1',
          name: 'Réseau eau potable',
          weight: 2,
          is_required: true,
          order_index: 2,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['MOYEN'],
        },
      ];

      const answers = [
        { item: items[0], status: 'BON' as const },
        { item: items[1], status: 'BON' as const },
      ];

      const result = calculateInspectionScore(answers, 'terrain');
      expect(result.score).toBe(100);
      expect(result.has_critical_defects).toBe(false);
      expect(result.disclaimer).toBe(LEGAL_DISCLAIMER_TERRAIN);
      expect(result.disclaimer).toContain('bornage contradictoire de géomètre-expert');
    });

    it('applies severe penalty for critical defect on property inspection and attaches immobilier disclaimer', () => {
      const items: InspectionItem[] = [
        {
          id: 'b-1',
          section_id: 's-1',
          name: 'Fissures traversantes structurelles',
          weight: 4,
          is_required: true,
          order_index: 1,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['CRITIQUE'],
        },
        {
          id: 'b-2',
          section_id: 's-2',
          name: 'Finitions intérieures',
          weight: 1,
          is_required: false,
          order_index: 2,
          possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
          possible_severities: ['FAIBLE'],
        },
      ];

      const answers = [
        { item: items[0], status: 'MAUVAIS' as const, severity: 'CRITIQUE' as const, comment: 'Fissure majeure sur mur porteur' },
        { item: items[1], status: 'BON' as const },
      ];

      const result = calculateInspectionScore(answers, 'immobilier');
      expect(result.has_critical_defects).toBe(true);
      expect(result.critical_defects).toHaveLength(1);
      expect(result.score).toBeLessThanOrEqual(29); // 49 - 20 = 29
      expect(result.disclaimer).toBe(LEGAL_DISCLAIMER_IMMOBILIER);
      expect(result.disclaimer).toContain('diagnostic de structure approfondi');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 8 : Génération PDF Rapport Terrain (land block + legal disclaimer)
  // --------------------------------------------------------------------------
  it('8. should generate PDF for Land report with land block and terrain disclaimer', async () => {
    const pdfData: ReportPdfData = {
      reportNumber: 'RPT-TRN-2026-001',
      date: '21/11/2026',
      score: 88,
      land: {
        parcelType: 'Terrain Constructible R+2',
        surfaceAreaM2: 600,
        cadastralRef: 'Section 4, Lot 108',
        topography: 'Terrain plat régulier',
        utilities: ['Electricité', 'Eau potable', 'Gaz naturel'],
        accessType: 'Voie carrossable goudronnée 8m',
        askingPrice: 18000000,
        location: 'Tipaza - Bou Ismaïl',
        gpsCoordinates: '36.64320, 2.69140',
        propertyPaper: 'Livret Foncier Individuel',
      },
      disclaimerText: LEGAL_DISCLAIMER_TERRAIN,
      expert: {
        fullName: 'Karim Boukhalfa',
        phone: '0550123456',
        wilaya: 'Tipaza',
        rcNumber: 'RC-16-A-00998877',
      },
      sections: [
        {
          title: 'Section 1 : Délimitation et Cadastre',
          items: [
            { name: 'Bornes physiques visibles', status: 'BON', comment: '4 bornes apparentes' },
            { name: 'Cohérence surface déclarée', status: 'BON' },
          ],
        },
        {
          title: 'Section 2 : Réseaux et Viabilisation',
          items: [
            { name: 'Poteau électrique à proximité', status: 'BON', comment: 'Moins de 10 mètres' },
            { name: 'Conduite eau potable', status: 'BON' },
          ],
        },
      ],
      positivePoints: ['Terrain parfaitement plat', 'Réseaux eau et électricité immédiats'],
      watchpoints: ['Branchement assainissement individuel à prévoir'],
      majorDefects: [],
      criticalDefects: [],
      summary: 'Terrain viabilisé de très bonne qualité géométrique et d accès facile.',
    };

    const pdfBuffer = await generateInspectionPdf(pdfData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF Magic number %PDF-
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  // --------------------------------------------------------------------------
  // TEST 9 : Génération PDF Rapport Immobilier Bâti (property block + legal disclaimer)
  // --------------------------------------------------------------------------
  it('9. should generate PDF for Property report with property block and immobilier disclaimer', async () => {
    const pdfData: ReportPdfData = {
      reportNumber: 'RPT-BAT-2026-002',
      date: '21/11/2026',
      score: 74,
      property: {
        propertyType: 'Appartement F4 Standing',
        livingAreaM2: 130,
        rooms: 4,
        floors: 2,
        constructionYear: 2019,
        condition: 'Bon état général',
        askingPrice: 28000000,
        location: 'Alger - Hydra',
        gpsCoordinates: '36.74100, 3.02500',
        propertyPaper: 'Acte Notarié avec Livret Foncier',
      },
      disclaimerText: LEGAL_DISCLAIMER_IMMOBILIER,
      expert: {
        fullName: 'Nadia Amrani',
        phone: '0661987654',
        wilaya: 'Alger',
        rcNumber: 'RC-16-B-00112233',
      },
      sections: [
        {
          title: 'Section 1 : Gros œuvre et Structure',
          items: [
            { name: 'Murs et plafonds', status: 'BON' },
            { name: 'Étanchéité toiture terrasse', status: 'MOYEN', comment: 'Légères traces humidité plafond coin séjour' },
          ],
        },
        {
          title: 'Section 2 : Électricité et Gaz',
          items: [
            { name: 'Tableau divisionnaire conforme', status: 'BON' },
            { name: 'Chaudière murale et radiateurs', status: 'BON', comment: 'En service lors de la visite' },
          ],
        },
      ],
      positivePoints: ['Excellente luminosité', 'Chauffage central fonctionnel'],
      watchpoints: ['Vérifier étanchéité terrasse auprès du syndic'],
      majorDefects: [],
      criticalDefects: [],
      summary: 'Appartement spacieux et sain, nécessitant un contrôle mineur de l étanchéité.',
    };

    const pdfBuffer = await generateInspectionPdf(pdfData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  // --------------------------------------------------------------------------
  // TEST 10 : Rétrocompatibilité génération PDF Automobile & buildReportPdfData
  // --------------------------------------------------------------------------
  describe('10. Backward compatibility with Vehicle reports & buildReportPdfData mapping', () => {
    it('generates standard vehicle PDF report with vehicle block and default disclaimer', async () => {
      const pdfData: ReportPdfData = {
        reportNumber: 'RPT-AUTO-2026-003',
        date: '21/11/2026',
        score: 92,
        vehicle: {
          make: 'Volkswagen',
          model: 'Golf 8',
          year: 2022,
          mileage: 38000,
          askingPrice: 5200000,
          location: 'Alger - Kouba',
        },
        disclaimerText: LEGAL_DISCLAIMER,
        expert: {
          fullName: 'Mohamed Said',
          phone: '0770554433',
          wilaya: 'Alger',
        },
        sections: [
          {
            title: 'Moteur et Transmission',
            items: [{ name: 'Niveaux fluides', status: 'BON' }],
          },
        ],
        positivePoints: ['Véhicule en état proche du neuf'],
        watchpoints: [],
        majorDefects: [],
        criticalDefects: [],
        summary: 'Excellent état général mécanique et carrosserie.',
      };

      const pdfBuffer = await generateInspectionPdf(pdfData);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it('buildReportPdfData maps persisted DB report for terrain correctly', () => {
      const mockDbReport = {
        id: '12345678-aaaa-bbbb-cccc-dddddddddddd',
        created_at: '2026-11-21T10:00:00Z',
        score: 85,
        summary: 'Terrain convenable',
        positive_points: ['Accès facile'],
        watchpoints: [],
        major_defects: [],
        critical_defects: [],
        bookings: {
          id: 'booking-trn-1',
          listings: {
            title: 'Terrain agricole 1000m²',
            location_wilaya: 'Blida',
            asking_price: 9000000,
            categories: { code: 'terrain' },
            listing_real_estate: [
              {
                domain: 'TERRAIN',
                property_type: 'Agricole',
                surface_m2: 1000,
                cadastral_ref: 'Lot 55',
                gps_lat: 36.47,
                gps_lng: 2.83,
                utilities: { water: true, electricity: true },
              },
            ],
          },
          expert: {
            profiles: { full_name: 'Expert Foncier' },
          },
        },
        answers: [
          { item_name: 'Accès piste', status: 'BON', comment: 'Accessible en 4x2' },
        ],
      };

      const mapped = buildReportPdfData(mockDbReport);
      expect(mapped.reportNumber).toBe('RPT-12345678');
      expect(mapped.land).toBeDefined();
      expect(mapped.vehicle).toBeUndefined();
      expect(mapped.land?.parcelType).toBe('Agricole');
      expect(mapped.land?.surfaceAreaM2).toBe(1000);
      expect(mapped.land?.gpsCoordinates).toBe('36.47000, 2.83000');
      expect(mapped.land?.utilities).toContain('Eau');
      expect(mapped.disclaimerText).toBe(LEGAL_DISCLAIMER_TERRAIN);
    });

    it('buildReportPdfData maps persisted DB report for automobile correctly', () => {
      const mockDbReport = {
        id: '87654321-aaaa-bbbb-cccc-dddddddddddd',
        created_at: '2026-11-21T10:00:00Z',
        score: 90,
        summary: 'Voiture impeccable',
        positive_points: ['Entretien suivi'],
        watchpoints: [],
        major_defects: [],
        critical_defects: [],
        bookings: {
          id: 'booking-auto-1',
          listings: {
            title: 'Toyota Yaris 2020',
            make: 'Toyota',
            model: 'Yaris',
            year: 2020,
            mileage: 50000,
            location_wilaya: 'Oran',
            asking_price: 2800000,
            categories: { code: 'automobile' },
          },
          expert: {
            profiles: { full_name: 'Expert Auto' },
          },
        },
        answers: [],
      };

      const mapped = buildReportPdfData(mockDbReport);
      expect(mapped.vehicle).toBeDefined();
      expect(mapped.land).toBeUndefined();
      expect(mapped.property).toBeUndefined();
      expect(mapped.vehicle?.make).toBe('Toyota');
      expect(mapped.vehicle?.model).toBe('Yaris');
      expect(mapped.disclaimerText).toBe(LEGAL_DISCLAIMER);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 11 : Audit structurel et idempotence du script SQL de migration (P8.05-D2)
  // --------------------------------------------------------------------------
  describe('11. SQL Migration Script Audit (20260912000012_terrain_immobilier_mvp.sql)', () => {
    const migrationPath = resolve(
      __dirname,
      '../packages/database/supabase/migrations/20260912000012_terrain_immobilier_mvp.sql'
    );
    const sqlContent = readFileSync(migrationPath, 'utf-8');

    it('contains no generic error masking (no EXCEPTION WHEN OTHERS THEN NULL)', () => {
      expect(sqlContent).not.toContain('WHEN OTHERS THEN');
      expect(sqlContent).not.toContain('EXCEPTION');
      expect(sqlContent).toContain('information_schema.columns');
      expect(sqlContent).toContain("column_name = 'make'");
      expect(sqlContent).toContain("column_name = 'model'");
      expect(sqlContent).toContain("column_name = 'year'");
    });

    it('resolves category_id dynamically in services rather than fixed UUIDs', () => {
      expect(sqlContent).toContain("(SELECT id FROM public.categories WHERE code = 'terrain')");
      expect(sqlContent).toContain("(SELECT id FROM public.categories WHERE code = 'immobilier')");
      expect(sqlContent).toContain('category_id = EXCLUDED.category_id');
    });

    it('omits redundant index on listing_id (already provided by UNIQUE constraint)', () => {
      expect(sqlContent).toContain('CONSTRAINT uq_listing_real_estate_listing_id UNIQUE (listing_id)');
      expect(sqlContent).not.toContain('CREATE INDEX IF NOT EXISTS idx_listing_real_estate_listing_id');
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_listing_real_estate_domain');
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_listing_real_estate_property_type');
    });

    it('defines exactly 32 columns on listing_real_estate', () => {
      const tableMatch = sqlContent.match(/CREATE TABLE IF NOT EXISTS public\.listing_real_estate \(([\s\S]*?)\);/);
      expect(tableMatch).toBeDefined();
      const body = tableMatch![1];
      const columnLines = body
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('CONSTRAINT') && !line.startsWith('--'));
      expect(columnLines).toHaveLength(32);

      // Verify key sensitive columns exist
      expect(sqlContent).toContain('gps_lat NUMERIC(10, 7)');
      expect(sqlContent).toContain('gps_lng NUMERIC(10, 7)');
      expect(sqlContent).toContain('gps_address_note TEXT');
      expect(sqlContent).toContain('cadastral_ref TEXT');
      expect(sqlContent).toContain('property_paper_declared TEXT');
      expect(sqlContent).toContain('surface_m2 NUMERIC(12, 2)');
      expect(sqlContent).toContain('domain TEXT NOT NULL CHECK (domain IN (\'TERRAIN\', \'IMMOBILIER\'))');
    });

    it('enforces least-privilege, idempotent RLS policies (SELECT, INSERT, UPDATE, DELETE)', () => {
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "listing_real_estate_select"');
      expect(sqlContent).toContain('CREATE POLICY "listing_real_estate_select"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "listing_real_estate_insert"');
      expect(sqlContent).toContain('CREATE POLICY "listing_real_estate_insert"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "listing_real_estate_update"');
      expect(sqlContent).toContain('CREATE POLICY "listing_real_estate_update"');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "listing_real_estate_delete"');
      expect(sqlContent).toContain('CREATE POLICY "listing_real_estate_delete"');

      // Security roles verification: strictly least privilege (P8.05-D3)
      expect(sqlContent).toContain('public.is_admin(auth.uid())');
      expect(sqlContent).toContain('l.buyer_id = auth.uid()');
      expect(sqlContent).toContain('b.expert_id = auth.uid()');

      // Unassigned experts must NOT have blanket access to sensitive GPS/cadastral data
      expect(sqlContent).not.toContain('verification_status');
    });

    it('verifies exact counts: 2 categories, 7 services, 2 templates, 14 sections, 28 items', () => {
      // 2 categories
      expect(sqlContent).toContain("'terrain'");
      expect(sqlContent).toContain("'immobilier'");

      // 7 distinct services
      const allServiceMatches = sqlContent.match(/'22222222-2222-2222-2222-2222222222[45][1-4]'/g) || [];
      const distinctServices = Array.from(new Set(allServiceMatches));
      expect(distinctServices).toHaveLength(7);

      // 2 templates
      const templateMatches = sqlContent.match(/'33333333-3333-3333-3333-3333333333[45]1'/g) || [];
      expect(Array.from(new Set(templateMatches))).toHaveLength(2);

      // 14 sections (6 terrain + 8 immobilier)
      const terrainSections = sqlContent.match(/'44444444-4444-4444-4444-44444444480[1-6]'/g) || [];
      const immoSections = sqlContent.match(/'44444444-4444-4444-4444-44444444490[1-8]'/g) || [];
      expect(Array.from(new Set(terrainSections))).toHaveLength(6);
      expect(Array.from(new Set(immoSections))).toHaveLength(8);
      expect(Array.from(new Set([...terrainSections, ...immoSections]))).toHaveLength(14);

      // 28 items (12 terrain + 16 immobilier)
      const terrainItems = sqlContent.match(/'55555555-5555-5555-5555-0000000009[01][0-9]'/g) || [];
      const immoItems = sqlContent.match(/'55555555-5555-5555-5555-0000000010[01][0-9]'/g) || [];
      const distinctTerrainItems = Array.from(new Set(terrainItems));
      const distinctImmoItems = Array.from(new Set(immoItems));
      expect(distinctTerrainItems).toHaveLength(12);
      expect(distinctImmoItems).toHaveLength(16);
      expect(distinctTerrainItems.length + distinctImmoItems.length).toBe(28);
    });
  });
});
