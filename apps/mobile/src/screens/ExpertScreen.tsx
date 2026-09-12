import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { 
  ItemStatus, 
  SeverityLevel, 
  calculateInspectionScore, 
  validateRequiredItemsCompleted,
  InspectionItem,
  AnswerWithItem
} from '@echrimheni/shared';

const AUTOMOBILE_SECTIONS = [
  {
    id: 'sec-1',
    title: '1. Moteur & Compartiment',
    items: [
      { id: 'it-1', section_id: 'sec-1', name: 'Démarrage à froid & bruits', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] },
      { id: 'it-2', section_id: 'sec-1', name: 'Fumée échappement', weight: 3, is_required: true, order_index: 2, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] },
      { id: 'it-3', section_id: 'sec-1', name: 'Fuites huile / liquide', weight: 3, is_required: true, order_index: 3, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  },
  {
    id: 'sec-2',
    title: '2. Freinage & Roulage',
    items: [
      { id: 'it-4', section_id: 'sec-2', name: 'Disques et plaquettes', weight: 2, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] },
      { id: 'it-5', section_id: 'sec-2', name: 'Efficacité frein à main', weight: 2, is_required: true, order_index: 2, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  },
  {
    id: 'sec-3',
    title: '3. Suspension & Direction',
    items: [
      { id: 'it-6', section_id: 'sec-3', name: 'Amortisseurs & coupelles', weight: 2, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  },
  {
    id: 'sec-4',
    title: '4. Carrosserie & Châssis',
    items: [
      { id: 'it-7', section_id: 'sec-4', name: 'Chocs antérieurs & mastic', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  },
  {
    id: 'sec-5',
    title: '5. Pneumatiques & Roues',
    items: [
      { id: 'it-8', section_id: 'sec-5', name: 'Usure & homogénéité pneus', weight: 2, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  },
  {
    id: 'sec-6',
    title: '6. Électronique & OBD',
    items: [
      { id: 'it-9', section_id: 'sec-6', name: 'Voyants tableau de bord', weight: 3, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  },
  {
    id: 'sec-7',
    title: '7. Habitacle & Intérieur',
    items: [
      { id: 'it-10', section_id: 'sec-7', name: 'Sellerie & ceintures', weight: 1, is_required: true, order_index: 1, possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[], possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE'] as SeverityLevel[] }
    ]
  }
];

export function ExpertScreen() {
  const [activeTab, setActiveTab] = useState<'mission' | 'checklist' | 'summary'>('checklist');
  const [answers, setAnswers] = useState<Record<string, { status: ItemStatus; severity?: SeverityLevel; comment: string }>>({
    'it-1': { status: 'BON', comment: 'Démarrage quart de tour' },
    'it-2': { status: 'BON', comment: 'Pas de fumée' },
    'it-3': { status: 'BON', comment: 'Moteur sec, pas de fuite' },
    'it-4': { status: 'MOYEN', severity: 'FAIBLE', comment: 'Plaquettes à 50% d usure' },
    'it-5': { status: 'BON', comment: 'Freinage net' },
    'it-6': { status: 'BON', comment: 'Pas de jeu' },
    'it-7': { status: 'BON', comment: 'Peinture d origine' },
    'it-8': { status: 'BON', comment: 'Pneus Michelin récents' },
    'it-9': { status: 'BON', comment: 'Zéro défaut OBD' },
    'it-10': { status: 'BON', comment: 'Habitacle soigné' }
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const handleSetStatus = (itemId: string, status: ItemStatus) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { comment: '' }),
        status
      }
    }));
  };

  const handleSetComment = (itemId: string, comment: string) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { status: 'BON' }),
        comment
      }
    }));
  };

  const allItems: InspectionItem[] = AUTOMOBILE_SECTIONS.flatMap(s => s.items);

  const handleFinalize = () => {
    const formattedAnswers = Object.entries(answers).map(([item_id, val]) => ({
      item_id,
      status: val.status
    }));

    const check = validateRequiredItemsCompleted(allItems, formattedAnswers);
    if (!check.isValid) {
      setValidationError(Attention :  point(s) obligatoire(s) non vérifié(s).);
      return;
    }

    setValidationError(null);

    const answersWithItems: AnswerWithItem[] = allItems.map(item => ({
      item,
      status: answers[item.id]?.status || 'BON',
      severity: answers[item.id]?.severity,
      comment: answers[item.id]?.comment
    }));

    const result = calculateInspectionScore(answersWithItems);
    setFinalScore(result.score);
    setActiveTab('summary');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <Text style={styles.headerBadge}>APPLICATION EXPERT TERRAIN</Text>
          <Text style={styles.verifiedTag}>EXPERT APPROUVÉ</Text>
        </View>
        <Text style={styles.headerTitle}>Inspection Terrain Automobile</Text>
        <Text style={styles.headerSubtitle}>Mission active : Golf 7 GTD (2018) • Bab Ezzouar</Text>
      </View>

      {validationError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      )}

      {activeTab === 'checklist' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Grille de Contrôle Dynamique (7 Blocs)</Text>
          <Text style={styles.subtext}>Renseignez l état constaté pour chaque point de contrôle avec photos/observations.</Text>

          {AUTOMOBILE_SECTIONS.map(section => (
            <View key={section.id} style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>{section.title}</Text>
              
              {section.items.map(item => {
                const currentAnswer = answers[item.id] || { status: 'BON', comment: '' };
                return (
                  <View key={item.id} style={styles.itemBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.is_required && <Text style={styles.requiredTag}>OBLIGATOIRE</Text>}
                    </View>

                    {/* Status Selectors */}
                    <View style={styles.statusRow}>
                      {(['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[]).map(st => (
                        <TouchableOpacity
                          key={st}
                          onPress={() => handleSetStatus(item.id, st)}
                          style={[
                            styles.statusBtn,
                            currentAnswer.status === st && (
                              st === 'BON' ? styles.statusBtnBon :
                              st === 'MOYEN' ? styles.statusBtnMoyen :
                              st === 'MAUVAIS' ? styles.statusBtnMauvais :
                              styles.statusBtnNonTeste
                            )
                          ]}
                        >
                          <Text style={[styles.statusBtnText, currentAnswer.status === st && styles.statusBtnTextActive]}>
                            {st}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Comment input */}
                    <TextInput
                      style={styles.commentInput}
                      value={currentAnswer.comment}
                      onChangeText={(txt) => handleSetComment(item.id, txt)}
                      placeholder="Ajouter une observation ou preuve photo..."
                      placeholderTextColor="#64748b"
                    />
                  </View>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.primaryButton} onPress={handleFinalize}>
            <Text style={styles.buttonText}>Finaliser & Calculer le Score</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'summary' && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Synthèse & Validation du Rapport</Text>
            <Text style={styles.scoreBadge}>Score Calculé : {finalScore} / 100</Text>
          </View>

          <Text style={styles.subtext}>Tous les 10 points de contrôle clés ont été examinés avec succès.</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryTitle}>✓ Prêt pour publication</Text>
            <Text style={styles.summaryDesc}>Le rapport sera immédiatement accessible par l acheteur dans son espace client et archivable en PDF.</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveTab('checklist')}>
            <Text style={styles.buttonText}>Revenir à la Checklist</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 16 },
  header: { marginBottom: 20 },
  headerBadge: { color: '#38bdf8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  headerSubtitle: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  subtext: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  sectionBlock: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', pb: 12 },
  sectionHeading: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  itemBox: { backgroundColor: '#020617', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  itemName: { color: '#f1f5f9', fontSize: 12, fontWeight: '600' },
  requiredTag: { color: '#f59e0b', fontSize: 9, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 6 },
  statusBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6, backgroundColor: '#1e293b' },
  statusBtnBon: { backgroundColor: '#059669' },
  statusBtnMoyen: { backgroundColor: '#d97706' },
  statusBtnMauvais: { backgroundColor: '#dc2626' },
  statusBtnNonTeste: { backgroundColor: '#475569' },
  statusBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  statusBtnTextActive: { color: '#ffffff' },
  commentInput: { backgroundColor: '#0f172a', borderRadius: 6, padding: 6, color: '#f8fafc', fontSize: 11, borderWidth: 1, borderColor: '#334155' },
  primaryButton: { backgroundColor: '#059669', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifiedTag: { backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#f87171', fontSize: 12, fontWeight: 'bold' },
  scoreBadge: { backgroundColor: '#059669', color: '#ffffff', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  summaryItem: { backgroundColor: '#020617', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#1e293b' },
  summaryTitle: { color: '#34d399', fontSize: 13, fontWeight: 'bold' },
  summaryDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 }
});