import { InspectionItem, ItemStatus, SeverityLevel } from '../types/index.js';

export interface AnswerWithItem {
  item: InspectionItem;
  status: ItemStatus;
  severity?: SeverityLevel;
  comment?: string;
}

export interface InspectionScoreResult {
  score: number; // 0 to 100
  positive_points: string[];
  watchpoints: string[];
  major_defects: string[];
  critical_defects: string[];
  has_critical_defects: boolean;
  disclaimer: string;
}

export const LEGAL_DISCLAIMER =
  "L’inspection reflète l’état constaté au moment de l’intervention et les contrôles effectivement réalisés. Elle ne constitue pas une garantie absolue de l’état futur de l’objet et ne remplace pas, lorsque nécessaire, une expertise juridique, réglementaire ou spécialisée.";

export const LEGAL_DISCLAIMER_TERRAIN =
  "L’inspection foncière / terrain constitue une constatation visuelle et technique des éléments apparents et des réseaux observables au moment de la visite. Elle ne constitue en aucun cas un bornage contradictoire de géomètre-expert, ni une garantie juridique de titre de propriété, de constructibilité ou d'alignement cadastral définitif.";

export const LEGAL_DISCLAIMER_IMMOBILIER =
  "L’inspection immobilière constitue un état des lieux visuel des désordres apparents et du fonctionnement des équipements testés au jour de la visite. Elle ne constitue ni un diagnostic de structure approfondi (sondages destructifs), ni une expertise en vices cachés, ni une garantie juridique de propriété ou de conformité d’urbanisme.";

export function getLegalDisclaimer(categoryCode?: string): string {
  const code = categoryCode?.toLowerCase();
  if (code === 'terrain') return LEGAL_DISCLAIMER_TERRAIN;
  if (code === 'immobilier') return LEGAL_DISCLAIMER_IMMOBILIER;
  return LEGAL_DISCLAIMER;
}

export function calculateInspectionScore(
  answers: AnswerWithItem[],
  categoryCode?: string
): InspectionScoreResult {
  let totalWeight = 0;
  let earnedScore = 0;

  const positive_points: string[] = [];
  const watchpoints: string[] = [];
  const major_defects: string[] = [];
  const critical_defects: string[] = [];

  for (const { item, status, severity, comment } of answers) {
    const weight = item.weight || 1;
    const label = comment ? `${item.name} (${comment})` : item.name;

    switch (status) {
      case 'BON':
        earnedScore += 100 * weight;
        totalWeight += weight;
        positive_points.push(label);
        break;
      case 'MOYEN':
        earnedScore += 60 * weight;
        totalWeight += weight;
        watchpoints.push(label);
        break;
      case 'MAUVAIS':
        totalWeight += weight;
        if (severity === 'CRITIQUE') {
          earnedScore += 0;
          critical_defects.push(label);
        } else if (severity === 'IMPORTANT') {
          earnedScore += 10 * weight;
          major_defects.push(label);
        } else {
          earnedScore += 25 * weight;
          watchpoints.push(label);
        }
        break;
      case 'NON_TESTE':
        // Excluded from scoring weight calculation
        break;
    }
  }

  let finalScore = totalWeight > 0 ? Math.round(earnedScore / totalWeight) : 0;

  // Severe penalty for critical defects
  if (critical_defects.length > 0) {
    const penalty = critical_defects.length * 20;
    finalScore = Math.max(0, Math.min(finalScore, 49 - penalty)); // cannot be > 49 if critical defect exists
  }

  return {
    score: finalScore,
    positive_points,
    watchpoints,
    major_defects,
    critical_defects,
    has_critical_defects: critical_defects.length > 0,
    disclaimer: getLegalDisclaimer(categoryCode)
  };
}

export function validateRequiredItemsCompleted(
  requiredItems: InspectionItem[],
  answers: { item_id: string; status: ItemStatus }[]
): { isValid: boolean; missingItems: InspectionItem[] } {
  const answeredItemIds = new Set(answers.map((a) => a.item_id));
  const missingItems = requiredItems.filter((item) => item.is_required && !answeredItemIds.has(item.id));
  return {
    isValid: missingItems.length === 0,
    missingItems
  };
}
