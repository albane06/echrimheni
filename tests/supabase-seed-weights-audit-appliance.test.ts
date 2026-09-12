import { describe, it, expect } from 'vitest';
import { 
  loadSeedApplianceChecklist,
  findSeedSqlPath
} from '../packages/database/src/services/seed-parser.js';
import { 
  calculateInspectionScore, 
  AnswerWithItem
} from '@echrimheni/shared';
import * as fs from 'fs';

describe('Audit Formel des Poids Supabase Électroménager (Sprint 4)', () => {
  const seedChecklist = loadSeedApplianceChecklist();

  it('charge directement les 16 items et 8 sections Électroménager depuis packages/database/supabase/seed.sql', () => {
    expect(seedChecklist.sections).toHaveLength(8);
    expect(seedChecklist.items).toHaveLength(16);
  });

  it('vérifie l exactitude stricte de chaque poids défini dans le fichier seed.sql pour Électroménager', () => {
    // Table de concordance formelle issue de la spécification Sprint 4
    const expectedWeights: Record<string, { section: string; name: string; weight: number }> = {
      '55555555-5555-5555-5555-000000000801': {
        section: 'Identification & Référence',
        name: 'Plaque signalétique, marque, modèle et n° de série lisibles',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000802': {
        section: 'Identification & Référence',
        name: 'Conformité de la référence constructeur et année',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000803': {
        section: 'État Extérieur & Structure',
        name: 'Carrosserie, parois, absence d enfoncement ou corrosion',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000804': {
        section: 'État Extérieur & Structure',
        name: 'Charnières, poignées, pieds réglables et fermetures',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000805': {
        section: 'Alimentation Électrique & Câblage',
        name: 'Cordon secteur, fiche 220V et mise à la terre conforme',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000806': {
        section: 'Alimentation Électrique & Câblage',
        name: 'Absence d échauffement anormal ou odeur de brûlé',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000807': {
        section: 'Fonctionnement Principal & Cycles',
        name: 'Démarrage effectif du cycle principal (moteur/compresseur)',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000808': {
        section: 'Fonctionnement Principal & Cycles',
        name: 'Efficacité du cycle opérationnel (froid/chaud/rotation/vidange)',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000809': {
        section: 'Commandes, Afficheur & Électronique',
        name: 'Panneau de commande, boutons tactiles/rotatifs et sélecteur',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000810': {
        section: 'Commandes, Afficheur & Électronique',
        name: 'Afficheur digital LED/LCD et absence de code erreur actif',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000811': {
        section: 'Bruits, Vibrations & Température',
        name: 'Niveau sonore en régime établi et absence de claquement',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000812': {
        section: 'Bruits, Vibrations & Température',
        name: 'Stabilité mécanique, absorption des vibrations et équilibrage',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000813': {
        section: 'Sécurité, Étanchéité & Anomalies',
        name: 'Étanchéité des joints de porte, cuve ou circuit frigorifique',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000814': {
        section: 'Sécurité, Étanchéité & Anomalies',
        name: 'Systèmes de sécurité (verrouillage porte, thermostat, anti-fuite)',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000815': {
        section: 'Accessoires, Tuyaux & Historique',
        name: 'Présence et état des accessoires d origine (filtres, clayettes)',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000816': {
        section: 'Accessoires, Tuyaux & Historique',
        name: 'Tuyaux d alimentation/évacuation d eau sans pliure ni fissure',
        weight: 2
      }
    };

    for (const item of seedChecklist.items) {
      const expected = expectedWeights[item.id];
      expect(expected, `L item ${item.id} (${item.name}) doit figurer dans la spécification`).toBeDefined();
      expect(item.name).toBe(expected.name);
      expect(item.weight).toBe(expected.weight);
    }

    // Somme totale des poids
    const totalWeights = seedChecklist.items.reduce((sum, it) => sum + it.weight, 0);
    expect(totalWeights).toBe(38);
  });

  it('démontre que le score 96/100 découle mathématiquement des poids Supabase et réagit dynamiquement', () => {
    const rawSql = fs.readFileSync(findSeedSqlPath(), 'utf8');
    expect(rawSql).toContain('55555555-5555-5555-5555-000000000801');

    const itemsFromSql = seedChecklist.items;

    // Simulation du scénario :
    // - Item 3 (Carrosserie & parois, poids 2) : MOYEN (60 pts)
    // - Item 4 (Charnières & fermetures, poids 2) : MOYEN (60 pts)
    // - 14 autres items : BON (100 pts) (poids cumulé = 34)
    const answers: AnswerWithItem[] = itemsFromSql.map((item) => {
      if (item.id === '55555555-5555-5555-5555-000000000803') {
        return { item, status: 'MOYEN', comment: 'Légères rayures sur le panneau latéral gauche' };
      }
      if (item.id === '55555555-5555-5555-5555-000000000804') {
        return { item, status: 'MOYEN', comment: 'Poignée de porte légèrement ferme à l ouverture' };
      }
      return { item, status: 'BON' };
    });

    const result = calculateInspectionScore(answers);

    // Calcul mathématique pas à pas :
    // Points = (34 * 100) + (2 * 60) + (2 * 60) = 3400 + 120 + 120 = 3640
    // Total poids = 38
    // Score brut = 3640 / 38 = 95.78947...
    // Math.round(95.78947...) = 96
    expect(result.score).toBe(96);
    expect(result.has_critical_defects).toBe(false);

    // Test de sensibilité 1 : Carrosserie remise en BON (96 -> 98)
    const answersPerfectBody = answers.map((a) =>
      a.item.id === '55555555-5555-5555-5555-000000000803' ? { ...a, status: 'BON' as const } : a
    );
    const scorePerfectBody = calculateInspectionScore(answersPerfectBody);
    // (36 * 100 + 2 * 60) / 38 = 3720 / 38 = 97.89... -> 98
    expect(scorePerfectBody.score).toBe(98);

    // Test de sensibilité 2 : Défaut critique sur le cordon électrique (MAUVAIS + CRITIQUE)
    const answersCriticalDefect = answers.map((a) =>
      a.item.id === '55555555-5555-5555-5555-000000000805'
        ? { ...a, status: 'MAUVAIS' as const, severity: 'CRITIQUE' as const, comment: 'Cordon dénudé avec risque de choc électrique' }
        : a
    );
    const scoreCritical = calculateInspectionScore(answersCriticalDefect);
    // Plafonnée à <= 49 (49 - 20 = 29)
    expect(scoreCritical.score).toBeLessThanOrEqual(49);
    expect(scoreCritical.has_critical_defects).toBe(true);
    expect(scoreCritical.critical_defects).toHaveLength(1);
  });
});
