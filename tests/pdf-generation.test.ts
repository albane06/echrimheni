import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { generateInspectionPdf, ReportPdfData } from '../packages/database/src/services/pdf.js';

describe('Real A4 PDF Report Generation', () => {
  it('generates a valid, structured A4 PDF document for an Automobile inspection', async () => {
    const reportData: ReportPdfData = {
      reportNumber: 'RPT-2026-DZ-0089',
      date: '12 Septembre 2026',
      score: 94,
      vehicle: {
        make: 'Volkswagen',
        model: 'Golf 7 GTD',
        year: 2018,
        mileage: 142000,
        askingPrice: 4200000,
        location: 'Bab Ezzouar, Alger'
      },
      expert: {
        fullName: 'Karim Benali',
        phone: '0550123456',
        wilaya: 'Alger',
        rcNumber: '16/00-0987654B20'
      },
      summary: 'Vehicule en excellent etat general. Moteur tres sain, aucun bruit anormal, carrosserie d origine.',
      positivePoints: [
        'Moteur demarre au quart de tour, zero fuite',
        'Peinture d origine confirmee, aucun redressage sur marbre',
        'Diagnostic OBD vierge de codes defauts critiques',
        'Pneumatiques recents avec usure reguliere'
      ],
      watchpoints: [
        'Plaquettes de frein avant a 50% d usure (a prevoir d ici 10 000 km)'
      ],
      majorDefects: [],
      criticalDefects: [],
      sections: [
        {
          title: '1. Moteur & Compartiment Moteur',
          items: [
            { name: 'Demarrage a froid & bruits', status: 'BON', comment: 'Impeccable' },
            { name: 'Fumee echappement', status: 'BON' },
            { name: 'Fuites visibles huile/liquides', status: 'BON', comment: 'Sec' }
          ]
        },
        {
          title: '2. Freinage & Roulage',
          items: [
            { name: 'Disques et plaquettes', status: 'MOYEN', severity: 'FAIBLE', comment: 'Usure 50%' },
            { name: 'Frein a main', status: 'BON' }
          ]
        },
        {
          title: '3. Suspension & Direction',
          items: [
            { name: 'Amortisseurs et coupelles', status: 'BON' },
            { name: 'Jeu de direction', status: 'BON' }
          ]
        },
        {
          title: '4. Carrosserie & Chassis',
          items: [
            { name: 'Chocs anterieurs & longerons', status: 'BON', comment: 'Intacts' },
            { name: 'Peinture & corrosion', status: 'BON' }
          ]
        },
        {
          title: '5. Pneumatiques & Roues',
          items: [
            { name: 'Usure et homogeneite', status: 'BON' }
          ]
        },
        {
          title: '6. Electronique & OBD',
          items: [
            { name: 'Voyants tableau de bord & OBD', status: 'BON', comment: '0 defaut' }
          ]
        },
        {
          title: '7. Habitacle & Interieur',
          items: [
            { name: 'Sellerie et ceintures', status: 'BON' }
          ]
        }
      ]
    };

    const pdfBuffer = await generateInspectionPdf(reportData);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(2000); // realistic multi-page PDF size
    
    // Check PDF magic header
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('renders major defects when supplied', async () => {
    const pdfBuffer = await generateInspectionPdf({
      reportNumber: 'RPT-MAJOR',
      date: '1 Octobre 2026',
      score: 40,
      vehicle: { make: 'Dacia', model: 'Logan', year: 2020, location: 'Alger' },
      expert: { fullName: 'Expert', phone: '', wilaya: '' },
      summary: 'Défauts relevés.',
      positivePoints: [],
      watchpoints: [],
      majorDefects: ['Freinage à réparer'],
      criticalDefects: [],
      sections: []
    });

    const source = pdfBuffer.toString('latin1');
    const start = source.indexOf('stream\n') + 'stream\n'.length;
    const end = source.indexOf('\nendstream', start);
    const pageText = inflateSync(pdfBuffer.subarray(start, end)).toString('latin1');
    // PDFKit encode le texte WinAnsi en hexadécimal et peut le fragmenter
    // pour appliquer le kerning : ces fragments prouvent le rendu effectif.
    expect(pageText).toMatch(/444546[\s\S]*555453204d414a45555253/);
    expect(pageText).toMatch(/2d2046[\s\S]*7265696e61676520e02072e97061726572/);
  });
});
