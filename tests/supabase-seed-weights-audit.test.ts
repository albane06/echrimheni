import { describe, it, expect } from 'vitest';
import { 
  loadSeedTelephoneChecklist,
  findSeedSqlPath
} from '../packages/database/src/services/seed-parser.js';
import { 
  calculateInspectionScore, 
  AnswerWithItem,
  InspectionItem
} from '@echrimheni/shared';
import * as fs from 'fs';

describe('Audit Formel des Poids Supabase (Cahier des Charges Section 8.2)', () => {
  const seedChecklist = loadSeedTelephoneChecklist();

  it('charge directement les 15 items et 7 sections depuis packages/database/supabase/seed.sql', () => {
    expect(seedChecklist.sections).toHaveLength(7);
    expect(seedChecklist.items).toHaveLength(15);
  });

  it('vérifie l exactitude stricte de chaque poids défini dans le fichier seed.sql de Supabase', () => {
    // Table de concordance formelle issue du Cahier des Charges (Section 8.2)
    const expectedWeights: Record<string, { section: string; name: string; weight: number }> = {
      '55555555-5555-5555-5555-000000000501': {
        section: 'Écran & Affichage Tactile',
        name: 'Réactivité tactile & absence de zones mortes',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000502': {
        section: 'Écran & Affichage Tactile',
        name: 'Dalle OLED/LCD (pixels morts, brûlures, luminosité)',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000503': {
        section: 'Écran & Affichage Tactile',
        name: 'Vitre tactile & rayures',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000504': {
        section: 'Batterie & Autonomie',
        name: 'État de santé de la batterie (%) & cycles',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000505': {
        section: 'Batterie & Autonomie',
        name: 'Comportement de charge & température',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000506': {
        section: 'Bloc Caméras & Flash',
        name: 'Capteurs photo arrière (grand angle, téléobjectif)',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000507': {
        section: 'Bloc Caméras & Flash',
        name: 'Caméra avant & Flash LED',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000508': {
        section: 'Réseau, SIM & Connectivité',
        name: 'Détection carte SIM & accroche réseau 4G/5G',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000509': {
        section: 'Réseau, SIM & Connectivité',
        name: 'Wi-Fi, Bluetooth & GPS',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000510': {
        section: 'Audio, Microphones & Écouteurs',
        name: 'Haut-parleurs stéréo & écouteur d appel',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000511': {
        section: 'Audio, Microphones & Écouteurs',
        name: 'Microphones d appel et de réduction de bruit',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000512': {
        section: 'Ports, Boutons & Biométrie',
        name: 'Port de charge (USB-C / Lightning)',
        weight: 2
      },
      '55555555-5555-5555-5555-000000000513': {
        section: 'Ports, Boutons & Biométrie',
        name: 'Reconnaissance biométrique (Face ID / Empreinte)',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000514': {
        section: 'Châssis & Historique d Ouverture',
        name: 'Traces d ouverture, vis de châssis & étanchéité',
        weight: 3
      },
      '55555555-5555-5555-5555-000000000515': {
        section: 'Châssis & Historique d Ouverture',
        name: 'État général du châssis & tiroir SIM d origine',
        weight: 2
      }
    };

    // Vérification de chaque item extrait directement du SQL Supabase
    for (const item of seedChecklist.items) {
      const expected = expectedWeights[item.id];
      expect(expected, `Item ${item.id} (${item.name}) doit exister dans la spécification`).toBeDefined();
      expect(item.name).toBe(expected.name);
      expect(item.weight).toBe(expected.weight);
    }

    // Calcul de la somme totale des poids
    const totalWeights = seedChecklist.items.reduce((sum, it) => sum + it.weight, 0);
    expect(totalWeights).toBe(36);
  });

  it('démontre que le score 94/100 découle mathématiquement des poids Supabase et NON d une constante', () => {
    const rawSql = fs.readFileSync(findSeedSqlPath(), 'utf8');
    expect(rawSql).toContain('55555555-5555-5555-5555-000000000501');

    // Les 15 items injectés sont directement ceux chargés depuis seed.sql
    const itemsFromSql = seedChecklist.items;

    // Simulation exacte du walkthrough avec les réponses de l expert :
    // - Item 3 (Vitre tactile & rayures, weight 2) : MOYEN (60 pts)
    // - Item 4 (Santé batterie, weight 3) : MOYEN (60 pts)
    // - 13 autres items : BON (100 pts)
    const answers: AnswerWithItem[] = itemsFromSql.map((item) => {
      if (item.id === '55555555-5555-5555-5555-000000000503') {
        // Vitre & micro-rayures (poids SQL = 2)
        return { item, status: 'MOYEN', comment: 'Micro-rayures d usage superficielles' };
      }
      if (item.id === '55555555-5555-5555-5555-000000000504') {
        // Batterie 85% (poids SQL = 3)
        return { item, status: 'MOYEN', comment: 'Capacité maximale 85%, 528 cycles' };
      }
      return { item, status: 'BON' };
    });

    // Calcul dynamique par la fonction officielle
    const result = calculateInspectionScore(answers);

    // Calcul analytique pas à pas pour vérification croisée :
    let manualEarnedScore = 0;
    let manualTotalWeight = 0;
    for (const ans of answers) {
      const w = ans.item.weight;
      manualTotalWeight += w;
      if (ans.status === 'BON') {
        manualEarnedScore += 100 * w;
      } else if (ans.status === 'MOYEN') {
        manualEarnedScore += 60 * w;
      }
    }

    const expectedEarned = 31 * 100 + 5 * 60; // 3100 + 300 = 3400
    expect(manualEarnedScore).toBe(expectedEarned);
    expect(manualTotalWeight).toBe(36);

    const manualScoreFloat = manualEarnedScore / manualTotalWeight; // 3400 / 36 = 94.444444...
    const manualScoreRounded = Math.round(manualScoreFloat);

    expect(manualScoreRounded).toBe(94);
    expect(result.score).toBe(manualScoreRounded);

    // PREUVE DE SENSIBILITÉ DYNAMIQUE :
    // Si la vitre tactile n avait pas été rayée (BON au lieu de MOYEN) :
    const answersPerfectGlass = answers.map((a) =>
      a.item.id === '55555555-5555-5555-5555-000000000503' ? { ...a, status: 'BON' as const } : a
    );
    const scorePerfectGlass = calculateInspectionScore(answersPerfectGlass);
    // (33 * 100 + 3 * 60) / 36 = 3480 / 36 = 96.666... -> 97
    expect(scorePerfectGlass.score).toBe(97);

    // Si la batterie avait un défaut critique (MAUVAIS avec CRITIQUE) :
    const answersDefectiveBattery = answers.map((a) =>
      a.item.id === '55555555-5555-5555-5555-000000000504'
        ? { ...a, status: 'MAUVAIS' as const, severity: 'CRITIQUE' as const }
        : a
    );
    const scoreDefective = calculateInspectionScore(answersDefectiveBattery);
    // Plafonnée à 29 (49 - 20)
    expect(scoreDefective.score).toBeLessThanOrEqual(49);
    expect(scoreDefective.has_critical_defects).toBe(true);
  });
});
