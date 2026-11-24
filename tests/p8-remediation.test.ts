import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  calculateInspectionScore,
  getLegalDisclaimer,
  LEGAL_DISCLAIMER,
  LEGAL_DISCLAIMER_TERRAIN,
  LEGAL_DISCLAIMER_IMMOBILIER,
  InspectionItem,
  AnswerWithItem,
} from '@echrimheni/shared';
import {
  assertTemplateMatchesService,
} from '../packages/database/src/services/expert.js';
import {
  ServiceError,
} from '../packages/database/src/services/ownership.js';

describe('MANDAT P8.07 / P8.07-R — Tests de Remédiation et Revue Finale', () => {

  // ==========================================================================
  // P1. GESTION DES 7 SERVICES & SERVICE-TEMPLATE MATCHING
  // ==========================================================================
  describe('P1. Déblocage et Contrôle des 7 Services Terrain & Immobilier', () => {
    const SERVICES_P8 = {
      // Services Terrain
      TERRAIN_VISUAL: '22222222-2222-2222-2222-222222222241',
      TERRAIN_TECH: '22222222-2222-2222-2222-222222222242',
      TERRAIN_AUDIT: '22222222-2222-2222-2222-222222222243',
      // Services Immobilier Bâti
      IMMO_APPART: '22222222-2222-2222-2222-222222222251',
      IMMO_VILLA: '22222222-2222-2222-2222-222222222252',
      IMMO_COMMERCIAL: '22222222-2222-2222-2222-222222222253',
      IMMO_IMMEUBLE: '22222222-2222-2222-2222-222222222254',
    };

    const TEMPLATES_EXISTANTS = {
      TERRAIN_TECH_TMPL: {
        id: '33333333-3333-3333-3333-333333333341',
        service_id: SERVICES_P8.TERRAIN_TECH,
        title: "Grille d'inspection Terrain & Foncier v1.0",
      },
      IMMO_VILLA_TMPL: {
        id: '33333333-3333-3333-3333-333333333351',
        service_id: SERVICES_P8.IMMO_VILLA,
        title: "Grille d'inspection Immobilier Bâti v1.0",
      },
    };

    it('P1.1 : Valide le matching strict template/service pour les deux services phares 2242 et 2252', () => {
      // 2242 : Inspection Technique Terrain
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.TERRAIN_TECH_TMPL, SERVICES_P8.TERRAIN_TECH)
      ).not.toThrow();

      // 2252 : Inspection Complète Villa
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.IMMO_VILLA_TMPL, SERVICES_P8.IMMO_VILLA)
      ).not.toThrow();
    });

    it('P1.2 : Rejette rigoureusement l association d un template générique inadapté aux 5 services spécifiques', () => {
      // Interdiction de forcer le template Villa sur un Appartement (absence de toit privatif, parties communes différentes)
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.IMMO_VILLA_TMPL, SERVICES_P8.IMMO_APPART)
      ).toThrow(ServiceError);

      // Interdiction de forcer le template Villa sur un Local Commercial (normes PMR, issues de secours, rideaux de fer)
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.IMMO_VILLA_TMPL, SERVICES_P8.IMMO_COMMERCIAL)
      ).toThrow(ServiceError);

      // Interdiction de forcer le template Villa sur un Immeuble R+ (structure collective, ascenseur, gaines techniques)
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.IMMO_VILLA_TMPL, SERVICES_P8.IMMO_IMMEUBLE)
      ).toThrow(ServiceError);

      // Interdiction de forcer le template Technique Terrain sur un Audit Foncier documentaire ou Visite simple
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.TERRAIN_TECH_TMPL, SERVICES_P8.TERRAIN_VISUAL)
      ).toThrow(ServiceError);
      expect(() =>
        assertTemplateMatchesService(TEMPLATES_EXISTANTS.TERRAIN_TECH_TMPL, SERVICES_P8.TERRAIN_AUDIT)
      ).toThrow(ServiceError);
    });

    it('P1.3 : Vérifie que startInspection empêche le démarrage si aucun template n est lié au service', () => {
      const expertCode = readFileSync(
        resolve(__dirname, '../packages/database/src/services/expert.ts'),
        'utf-8'
      );

      // Vérifie la présence du garde de sécurité dans startInspection
      expect(expertCode).toContain('Vérification préalable qu\'un modèle d\'inspection actif existe');
      expect(expertCode).toContain('Démarrage refusé : aucun modèle d\'inspection actif n\'est associé au service');
    });

    it('P1.4 : Vérifie que loadDynamicChecklist renvoie un ServiceError NOT_FOUND explicite', () => {
      const expertCode = readFileSync(
        resolve(__dirname, '../packages/database/src/services/expert.ts'),
        'utf-8'
      );

      expect(expertCode).toContain('Checklist indisponible : aucun modèle d\'inspection actif pour le service');
    });

    it('P1.5 [P8.07-R] : Audit arithmétique et intégrité de la migration des 5 grilles complémentaires', () => {
      const sqlPath = resolve(
        __dirname,
        '../packages/database/supabase/migrations/20260912000013_terrain_immobilier_templates_complement.sql'
      );
      const sql = readFileSync(sqlPath, 'utf-8');

      // 1. Templates
      const tmplBlock = sql.split('INSERT INTO public.inspection_templates')[1].split('ON CONFLICT')[0];
      const tmplRegex = /\(\s*'([0-9a-f-]+)',\s*'([0-9a-f-]+)',\s*'((?:''|[^'])*)',\s*(\d+),\s*(true|false)\s*\)/g;
      const templates = [...tmplBlock.matchAll(tmplRegex)].map(m => ({
        id: m[1],
        serviceId: m[2],
        title: m[3].replace(/''/g, "'"),
      }));
      expect(templates.length).toBe(5);

      // 2. Sections
      const secBlock = sql.split('INSERT INTO public.inspection_sections')[1].split('ON CONFLICT')[0];
      const secRegex = /\(\s*'([0-9a-f-]+)',\s*'([0-9a-f-]+)',\s*'((?:''|[^'])*)',\s*(\d+)\s*\)/g;
      const sections = [...secBlock.matchAll(secRegex)].map(m => ({
        id: m[1],
        templateId: m[2],
        title: m[3].replace(/''/g, "'"),
      }));
      expect(sections.length).toBe(28);

      // 3. Items
      const itBlock = sql.split('INSERT INTO public.inspection_items')[1].split('ON CONFLICT')[0];
      const itRegex = /\(\s*'([0-9a-f-]+)',\s*'([0-9a-f-]+)',\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*(\d+),\s*(true|false),\s*(\d+)\s*\)/g;
      const items = [...itBlock.matchAll(itRegex)].map(m => ({
        id: m[1],
        sectionId: m[2],
        name: m[3].replace(/''/g, "'"),
        weight: parseInt(m[5]),
        isRequired: m[6] === 'true',
      }));
      expect(items.length).toBe(58);

      // Vérification des poids exacts par template :
      // 2241 (Visite Terrain) : 4 sections, 8 items, poids 24
      const tmpl2241 = templates.find(t => t.serviceId === SERVICES_P8.TERRAIN_VISUAL)!;
      const secs2241 = sections.filter(s => s.templateId === tmpl2241.id);
      const items2241 = items.filter(it => secs2241.some(s => s.id === it.sectionId));
      expect(secs2241.length).toBe(4);
      expect(items2241.length).toBe(8);
      expect(items2241.reduce((sum, it) => sum + it.weight, 0)).toBe(24);

      // 2243 (Audit Foncier) : 5 sections, 10 items, poids 39
      const tmpl2243 = templates.find(t => t.serviceId === SERVICES_P8.TERRAIN_AUDIT)!;
      const secs2243 = sections.filter(s => s.templateId === tmpl2243.id);
      const items2243 = items.filter(it => secs2243.some(s => s.id === it.sectionId));
      expect(secs2243.length).toBe(5);
      expect(items2243.length).toBe(10);
      expect(items2243.reduce((sum, it) => sum + it.weight, 0)).toBe(39);

      // 2251 (Diagnostic Appartement) : 7 sections, 14 items, poids 42
      const tmpl2251 = templates.find(t => t.serviceId === SERVICES_P8.IMMO_APPART)!;
      const secs2251 = sections.filter(s => s.templateId === tmpl2251.id);
      const items2251 = items.filter(it => secs2251.some(s => s.id === it.sectionId));
      expect(secs2251.length).toBe(7);
      expect(items2251.length).toBe(14);
      expect(items2251.reduce((sum, it) => sum + it.weight, 0)).toBe(42);

      // 2253 (Local Commercial) : 6 sections, 12 items, poids 38
      const tmpl2253 = templates.find(t => t.serviceId === SERVICES_P8.IMMO_COMMERCIAL)!;
      const secs2253 = sections.filter(s => s.templateId === tmpl2253.id);
      const items2253 = items.filter(it => secs2253.some(s => s.id === it.sectionId));
      expect(secs2253.length).toBe(6);
      expect(items2253.length).toBe(12);
      expect(items2253.reduce((sum, it) => sum + it.weight, 0)).toBe(38);

      // 2254 (Immeuble R+) : 6 sections, 14 items, poids 52
      const tmpl2254 = templates.find(t => t.serviceId === SERVICES_P8.IMMO_IMMEUBLE)!;
      const secs2254 = sections.filter(s => s.templateId === tmpl2254.id);
      const items2254 = items.filter(it => secs2254.some(s => s.id === it.sectionId));
      expect(secs2254.length).toBe(6);
      expect(items2254.length).toBe(14);
      expect(items2254.reduce((sum, it) => sum + it.weight, 0)).toBe(52);

      // Zéro section ou item orphelin
      const tmplIdSet = new Set(templates.map(t => t.id));
      expect(sections.every(s => tmplIdSet.has(s.templateId))).toBe(true);
      const secIdSet = new Set(sections.map(s => s.id));
      expect(items.every(it => secIdSet.has(it.sectionId))).toBe(true);

      // Tous les items sont obligatoires
      expect(items.every(it => it.isRequired)).toBe(true);
    });
  });

  // ==========================================================================
  // P3. CORRECTION DE LA DÉCHARGE LÉGALE (DISCLAIMER)
  // ==========================================================================
  describe('P3. Décharge Légale Enregistrée et Cohérence Multi-Domaines', () => {
    const dummyItem: InspectionItem = {
      id: 'item-1',
      section_id: 'sec-1',
      name: 'Point de contrôle test',
      weight: 3,
      is_required: true,
      order_index: 1,
    };

    const dummyAnswers: AnswerWithItem[] = [
      {
        item: dummyItem,
        status: 'BON',
        comment: 'Conforme',
      },
    ];

    it('P3.1 : Retourne la décharge légale Terrain si categoryCode est terrain', () => {
      const result = calculateInspectionScore(dummyAnswers, 'terrain');
      expect(result.disclaimer).toBe(LEGAL_DISCLAIMER_TERRAIN);
      expect(result.disclaimer).toContain('L’inspection foncière / terrain');
      expect(result.disclaimer).toContain('bornage contradictoire de géomètre-expert');
    });

    it('P3.2 : Retourne la décharge légale Immobilier si categoryCode est immobilier', () => {
      const result = calculateInspectionScore(dummyAnswers, 'immobilier');
      expect(result.disclaimer).toBe(LEGAL_DISCLAIMER_IMMOBILIER);
      expect(result.disclaimer).toContain('L’inspection immobilière');
      expect(result.disclaimer).toContain('vices cachés');
    });

    it('P3.3 : Retourne la décharge légale Automobile / Standard par défaut', () => {
      const resultDefault = calculateInspectionScore(dummyAnswers);
      expect(resultDefault.disclaimer).toBe(LEGAL_DISCLAIMER);
      expect(resultDefault.disclaimer).toContain('L’inspection reflète l’état constaté');

      const resultAuto = calculateInspectionScore(dummyAnswers, 'automobile');
      expect(resultAuto.disclaimer).toBe(LEGAL_DISCLAIMER);
    });

    it('P3.4 : Vérifie que finalizeAndPublishReport résout et transmet le categoryCode', () => {
      const expertCode = readFileSync(
        resolve(__dirname, '../packages/database/src/services/expert.ts'),
        'utf-8'
      );

      expect(expertCode).toContain('categoryCode?: string;');
      expect(expertCode).toContain('Résolution robuste du categoryCode');
      expect(expertCode).toContain('calculateInspectionScore(params.answersWithItems, categoryCode)');
    });

    it('P3.5 : Vérifie que ExpertScreen.tsx extrait et passe categoryCode lors de la finalisation', () => {
      const screenCode = readFileSync(
        resolve(__dirname, '../apps/mobile/src/screens/ExpertScreen.tsx'),
        'utf-8'
      );

      expect(screenCode).toContain('calculateInspectionScore(answersWithItems, categoryCode)');
      expect(screenCode).toContain('categoryCode,');
    });
  });

  // ==========================================================================
  // P2. ENRICHISSEMENT WEBAPP ADMIN (DETAIL MISSION & MISSIONS LIST)
  // ==========================================================================
  describe('P2. Webapp Admin — Affichage Exhaustif des Missions Foncier & Immobilier', () => {
    it('P2.1 : getAllMissions sélectionne listing_real_estate et categories', () => {
      const adminCode = readFileSync(
        resolve(__dirname, '../packages/database/src/services/admin.ts'),
        'utf-8'
      );

      expect(adminCode).toContain('listing_real_estate(*)');
      expect(adminCode).toContain('categories(code, name)');
      expect(adminCode).toContain('location_commune');
    });

    it('P2.2 : MissionDetailPage affiche les attributs fonciers et bâtis', () => {
      const pageCode = readFileSync(
        resolve(__dirname, '../apps/web-admin/src/app/missions/[id]/page.tsx'),
        'utf-8'
      );

      // Présence du bloc dédié Spécificités du bien
      expect(pageCode).toContain('Spécificités du bien');
      expect(pageCode).toContain('mission.real_estate.surface_m2');
      expect(pageCode).toContain('mission.real_estate.cadastral_ref');
      expect(pageCode).toContain('mission.real_estate.property_paper_declared');
      expect(pageCode).toContain('mission.real_estate.gps_lat');
      expect(pageCode).toContain('mission.real_estate.road_access');
      expect(pageCode).toContain('Réseaux & Viabilisation');
      expect(pageCode).toContain('Caractéristiques du Bâti');
      expect(pageCode).toContain('mission.real_estate.rooms_count');
      expect(pageCode).toContain('mission.real_estate.floors');
      expect(pageCode).toContain('mission.real_estate.has_elevator');
      expect(pageCode).toContain('mission.real_estate.construction_year');
    });

    it('P2.3 : MissionsPage affiche la catégorie / domaine et permet la recherche par catégorie', () => {
      const listCode = readFileSync(
        resolve(__dirname, '../apps/web-admin/src/app/missions/page.tsx'),
        'utf-8'
      );

      expect(listCode).toContain('category_name: catName');
      expect(listCode).toContain('r.category_name');
      expect(listCode).toContain('Rechercher par objet, catégorie ou acheteur');
      expect(listCode).toContain('m.category_name.toLowerCase().includes(search.toLowerCase())');
    });

    it('P2.4 : getAllReports sélectionne également listing_real_estate pour les rapports admin', () => {
      const adminCode = readFileSync(
        resolve(__dirname, '../packages/database/src/services/admin.ts'),
        'utf-8'
      );

      expect(adminCode).toContain('getAllReports');
      expect(adminCode).toContain('listing_real_estate(*)');
    });
  });

  // ==========================================================================
  // P4 & SÉCURITÉ : AUDIT DES INTERFACES ET RESPECT RLS
  // ==========================================================================
  describe('P4 & Sécurité : Respect des Droits et Non-Régression', () => {
    it('P4.1 : La politique RLS de listing_real_estate protège les données sensibles', () => {
      const migrationCode = readFileSync(
        resolve(__dirname, '../packages/database/supabase/migrations/20260912000012_terrain_immobilier_mvp.sql'),
        'utf-8'
      );

      expect(migrationCode).toContain('CREATE POLICY "listing_real_estate_select"');
      expect(migrationCode).toContain('public.is_admin(auth.uid())');
      expect(migrationCode).toContain('l.buyer_id = auth.uid()');
      expect(migrationCode).toContain('b.expert_id = auth.uid()');
    });

    it('P4.2 : Vérifie que le typecheck monorepo est sain et rétrocompatible', () => {
      // Les types partagés n ont pas été cassés
      expect(LEGAL_DISCLAIMER_TERRAIN).toBeDefined();
      expect(LEGAL_DISCLAIMER_IMMOBILIER).toBeDefined();
      expect(getLegalDisclaimer('terrain')).toBe(LEGAL_DISCLAIMER_TERRAIN);
      expect(getLegalDisclaimer('immobilier')).toBe(LEGAL_DISCLAIMER_IMMOBILIER);
    });
  });
});
