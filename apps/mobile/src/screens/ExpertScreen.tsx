import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { 
  ItemStatus, 
  SeverityLevel, 
  calculateInspectionScore, 
  validateRequiredItemsCompleted,
  InspectionItem,
  AnswerWithItem
} from '@echrimheni/shared';
import { loadDynamicChecklist } from '@echrimheni/database';

export function ExpertScreen({ 
  expertId = 'exp-001', 
  initialVerificationStatus = 'APPROVED' 
}: { 
  expertId?: string; 
  initialVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' 
}) {
  const [verificationStatus, setVerificationStatus] = useState(initialVerificationStatus);
  const [activeTab, setActiveTab] = useState<'mission' | 'checklist' | 'summary'>('checklist');
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, { status: ItemStatus; severity?: SeverityLevel; comment: string }>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      const data = await loadDynamicChecklist();
      if (data?.sections && data.sections.length > 0) {
        setSections(data.sections);
        // Pre-initialize answers with default BON
        const initialAnswers: Record<string, any> = {};
        data.sections.forEach(s => {
          s.items.forEach((it: any) => {
            initialAnswers[it.id] = { status: 'BON', comment: '' };
          });
        });
        setAnswers(initialAnswers);
      } else {
        setSections(getFallbackAutomobileSections());
      }
    } catch (err) {
      console.warn('Utilisation de la grille automobile de secours :', err);
      setSections(getFallbackAutomobileSections());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackAutomobileSections = () => [
    {
      id: 'sec-1',
      title: '1. Moteur & Compartiment',
      items: [
        { id: 'it-1', section_id: 'sec-1', name: 'Démarrage à froid & bruits', weight: 3, is_required: true },
        { id: 'it-2', section_id: 'sec-1', name: 'Fumée échappement', weight: 3, is_required: true },
        { id: 'it-3', section_id: 'sec-1', name: 'Fuites huile / liquide', weight: 3, is_required: true }
      ]
    },
    {
      id: 'sec-2',
      title: '2. Freinage & Roulage',
      items: [
        { id: 'it-4', section_id: 'sec-2', name: 'Disques et plaquettes', weight: 2, is_required: true },
        { id: 'it-5', section_id: 'sec-2', name: 'Efficacité frein à main', weight: 2, is_required: true }
      ]
    },
    {
      id: 'sec-3',
      title: '3. Suspension & Direction',
      items: [
        { id: 'it-6', section_id: 'sec-3', name: 'Amortisseurs & coupelles', weight: 2, is_required: true }
      ]
    },
    {
      id: 'sec-4',
      title: '4. Carrosserie & Châssis',
      items: [
        { id: 'it-7', section_id: 'sec-4', name: 'Chocs antérieurs & mastic', weight: 3, is_required: true }
      ]
    },
    {
      id: 'sec-5',
      title: '5. Pneumatiques & Roues',
      items: [
        { id: 'it-8', section_id: 'sec-5', name: 'Usure & homogénéité pneus', weight: 2, is_required: true }
      ]
    },
    {
      id: 'sec-6',
      title: '6. Électronique & OBD',
      items: [
        { id: 'it-9', section_id: 'sec-6', name: 'Voyants tableau de bord & scan OBD', weight: 3, is_required: true }
      ]
    },
    {
      id: 'sec-7',
      title: '7. Habitacle & Intérieur',
      items: [
        { id: 'it-10', section_id: 'sec-7', name: 'Sellerie & ceintures', weight: 1, is_required: true }
      ]
    }
  ];

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

  const allItems: InspectionItem[] = sections.flatMap(s => s.items);

  const handleFinalize = () => {
    const formattedAnswers = Object.entries(answers).map(([item_id, val]) => ({
      item_id,
      status: val.status
    }));

    const check = validateRequiredItemsCompleted(allItems, formattedAnswers);
    if (!check.isValid) {
      setValidationError(`Attention : ${check.missingItems.length} point(s) obligatoire(s) non vérifié(s).`);
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
          <Text style={[
            styles.verifiedTag,
            verificationStatus === 'PENDING' && styles.pendingTag,
            verificationStatus === 'REJECTED' && styles.rejectedTag
          ]}>
            {verificationStatus === 'APPROVED' ? 'EXPERT VÉRIFIÉ' : verificationStatus}
          </Text>
        </View>
        <Text style={styles.headerTitle}>Inspection Terrain Automobile</Text>
        <Text style={styles.headerSubtitle}>Mission active : Golf 7 GTD (2018) • Bab Ezzouar</Text>
      </View>

      {/* Enforcement: If PENDING or REJECTED, block mission execution */}
      {verificationStatus !== 'APPROVED' ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Dossier en cours d examen</Text>
          <Text style={styles.warningText}>
            Conformément aux règles de sécurité, vous ne pouvez pas accepter ou réaliser de mission tant que vos pièces justificatives (CNI et Registre de Commerce) n ont pas été validées par un administrateur.
          </Text>
        </View>
      ) : (
        <>
          {validationError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}

          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#38bdf8" />
              <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>Chargement de la grille d inspection...</Text>
            </View>
          ) : activeTab === 'checklist' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Grille de Contrôle Automobile (7 Blocs Chargés)</Text>
              <Text style={styles.subtext}>Renseignez le diagnostic pour chaque point de contrôle avec preuves et commentaires.</Text>

              {sections.map(section => (
                <View key={section.id} style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>{section.title}</Text>
                  
                  {section.items.map((item: any) => {
                    const currentAnswer = answers[item.id] || { status: 'BON', comment: '' };
                    return (
                      <View key={item.id} style={styles.itemBox}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.is_required && <Text style={styles.requiredTag}>OBLIGATOIRE</Text>}
                        </View>

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

                        <TextInput
                          style={styles.commentInput}
                          value={currentAnswer.comment}
                          onChangeText={(txt) => handleSetComment(item.id, txt)}
                          placeholder="Observation ou photo justificative..."
                          placeholderTextColor="#64748b"
                        />
                      </View>
                    );
                  })}
                </View>
              ))}

              <TouchableOpacity style={styles.primaryButton} onPress={handleFinalize}>
                <Text style={styles.buttonText}>Finaliser l Inspection & Calculer le Score</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Synthèse & Validation du Rapport</Text>
                <Text style={styles.scoreBadge}>Score Calculé : {finalScore} / 100</Text>
              </View>

              <Text style={styles.subtext}>Tous les points obligatoires ont été validés avec succès.</Text>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryTitle}>✓ Prêt pour publication officielle</Text>
                <Text style={styles.summaryDesc}>Le rapport officiel généré et certifié sera immédiatement mis à disposition du client et téléchargeable en PDF A4.</Text>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveTab('checklist')}>
                <Text style={styles.buttonText}>Revenir à la Checklist</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  sectionBlock: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 12 },
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
  pendingTag: { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
  rejectedTag: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#f87171', fontSize: 12, fontWeight: 'bold' },
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: '#f59e0b', padding: 16, borderRadius: 12, marginTop: 16 },
  warningTitle: { color: '#fbbf24', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  warningText: { color: '#fde68a', fontSize: 12, lineHeight: 18 },
  scoreBadge: { backgroundColor: '#059669', color: '#ffffff', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  summaryItem: { backgroundColor: '#020617', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#1e293b' },
  summaryTitle: { color: '#34d399', fontSize: 13, fontWeight: 'bold' },
  summaryDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 }
});
