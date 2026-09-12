import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { calculateCommission, PaymentService, MockPaymentProvider, LEGAL_DISCLAIMER } from '@echrimheni/shared';

export function BuyerScreen() {
  const [step, setStep] = useState<'create' | 'select_expert' | 'payment' | 'tracking' | 'report'>('create');
  
  // Listing Form State
  const [make, setMake] = useState('Volkswagen');
  const [model, setModel] = useState('Golf 7 GTD');
  const [year, setYear] = useState('2018');
  const [mileage, setMileage] = useState('142000');
  const [price, setPrice] = useState('4200000');
  const [wilaya, setWilaya] = useState('Alger');
  const [commune, setCommune] = useState('Bab Ezzouar');

  // Booking & Payment State
  const inspectionPrice = 7000;
  const pricing = calculateCommission(inspectionPrice, 0.15);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PROCESSING' | 'PAID' | 'FAILED'>('IDLE');

  const handlePaySandbox = async () => {
    setPaymentStatus('PROCESSING');
    const service = new PaymentService(new MockPaymentProvider(false));
    const result = await service.pay('book-auto-01', inspectionPrice, 'SANDBOX');
    if (result.success) {
      setPaymentStatus('PAID');
      setTimeout(() => setStep('tracking'), 1000);
    } else {
      setPaymentStatus('FAILED');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerBadge}>ESPACE ACHETEUR</Text>
        <Text style={styles.headerTitle}>Inspection Automobile Avant Achat</Text>
        <Text style={styles.headerSubtitle}>Faites vérifier le véhicule par un expert certifié avant de payer le vendeur.</Text>
      </View>

      {/* Step 1: Create Request */}
      {step === 'create' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Informations du Véhicule à Inspecter</Text>
          
          <Text style={styles.label}>Marque & Modèle</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={make} onChangeText={setMake} placeholder="Marque" placeholderTextColor="#64748b" />
            <TextInput style={[styles.input, { flex: 1 }]} value={model} onChangeText={setModel} placeholder="Modèle" placeholderTextColor="#64748b" />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Année</Text>
              <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Kilométrage (km)</Text>
              <TextInput style={styles.input} value={mileage} onChangeText={setMileage} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
          </View>

          <Text style={styles.label}>Prix demandé par le vendeur (DZD)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor="#64748b" />

          <Text style={styles.label}>Localisation du véhicule</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={wilaya} onChangeText={setWilaya} placeholder="Wilaya" placeholderTextColor="#64748b" />
            <TextInput style={[styles.input, { flex: 1 }]} value={commune} onChangeText={setCommune} placeholder="Commune" placeholderTextColor="#64748b" />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('select_expert')}>
            <Text style={styles.buttonText}>Continuer vers le choix de l expert</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Select Expert */}
      {step === 'select_expert' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Sélectionner un Expert Vérifié</Text>
          <Text style={styles.subtext}>Seuls les professionnels ayant validé leur Registre de Commerce et leur pièce d identité sont affichés.</Text>

          <View style={styles.expertCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.expertName}>Karim Benali</Text>
              <Text style={styles.verifiedBadge}>EXPERT VÉRIFIÉ</Text>
            </View>
            <Text style={styles.expertDetails}>Alger (Bab Ezzouar) • Spécialiste Diagnostic & Moteur</Text>
            <Text style={styles.expertBio}>12 ans d expérience en diagnostic mécanique multimarque et détection de chocs.</Text>
            
            <View style={styles.rowBetween}>
              <Text style={styles.ratingText}>★ 4.85 / 5 (24 avis)</Text>
              <Text style={styles.priceTag}>7 000 DZD</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('payment')}>
              <Text style={styles.buttonText}>Choisir cet expert & Réserver</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Payment Sandbox */}
      {step === 'payment' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Règlement de la Mission (Sandbox MVP)</Text>
          <Text style={styles.subtext}>Le paiement réel est séquestré jusqu à la remise du rapport complet.</Text>

          <View style={styles.priceSummary}>
            <View style={styles.rowBetween}>
              <Text style={styles.summaryLabel}>Tarif inspection complète</Text>
              <Text style={styles.summaryValue}>{pricing.totalAmount} DZD</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.summaryLabel}>Part reversée à l expert</Text>
              <Text style={styles.summaryValue}>{pricing.expertPayout} DZD</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.summaryLabel}>Commission plateforme (15%)</Text>
              <Text style={styles.summaryValue}>{pricing.platformCommission} DZD</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, paymentStatus === 'PROCESSING' && { opacity: 0.7 }]} 
            onPress={handlePaySandbox}
            disabled={paymentStatus === 'PROCESSING'}
          >
            <Text style={styles.buttonText}>
              {paymentStatus === 'PROCESSING' ? 'Validation en cours...' : 'Confirmer Paiement Sandbox (7 000 DZD)'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 4: Tracking */}
      {step === 'tracking' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Suivi de votre Mission en Direct</Text>
          
          <View style={styles.statusBox}>
            <Text style={styles.statusStep}>Statut actuel : <Text style={styles.statusHighlight}>IN_PROGRESS</Text></Text>
            <Text style={styles.statusDesc}>L expert Karim Benali est actuellement sur place et inspecte les 7 sections du véhicule.</Text>
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('report')}>
            <Text style={styles.secondaryButtonText}>Simuler réception du Rapport Prêt</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 5: Report Consultation */}
      {step === 'report' && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Rapport d Inspection Officiel</Text>
            <Text style={styles.scoreBadge}>Score : 92 / 100</Text>
          </View>

          <Text style={styles.subtext}>Véhicule : {make} {model} ({year}) • Expert : Karim Benali</Text>
          
          <View style={styles.reportSection}>
            <Text style={styles.reportSubtitle}>✓ Points Positifs constatés (6/7)</Text>
            <Text style={styles.reportItem}>• Moteur : Démarrage immédiat, aucune fuite ni claquement.</Text>
            <Text style={styles.reportItem}>• Carrosserie : Peinture d origine, aucune trace de marbre ou redressage.</Text>
            <Text style={styles.reportItem}>• Électronique : Diagnostic OBD vierge de codes défauts critiques.</Text>
          </View>

          <View style={styles.reportSection}>
            <Text style={styles.reportSubtitleWarn}>⚠ Points à surveiller (1/7)</Text>
            <Text style={styles.reportItem}>• Freinage : Plaquettes avant à prévoir d ici 5 000 km (usure 70%).</Text>
          </View>

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerTitle}>Mention Légale de Limitation :</Text>
            <Text style={styles.disclaimerText}>{LEGAL_DISCLAIMER}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('create')}>
            <Text style={styles.buttonText}>Nouvelle Demande d Inspection</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 16 },
  header: { marginBottom: 20 },
  headerBadge: { color: '#34d399', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  headerSubtitle: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtext: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#ffffff', fontSize: 13 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryButton: { backgroundColor: '#059669', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  secondaryButtonText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  expertCard: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginTop: 8 },
  expertName: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  verifiedBadge: { color: '#34d399', fontSize: 10, fontWeight: 'bold', backgroundColor: 'rgba(52, 211, 153, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expertDetails: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  expertBio: { color: '#cbd5e1', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  ratingText: { color: '#fbbf24', fontSize: 12, fontWeight: '600', marginTop: 8 },
  priceTag: { color: '#34d399', fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  priceSummary: { backgroundColor: '#020617', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', gap: 6 },
  summaryLabel: { color: '#94a3b8', fontSize: 12 },
  summaryValue: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  statusBox: { backgroundColor: '#1e293b', padding: 14, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
  statusStep: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  statusHighlight: { color: '#38bdf8' },
  statusDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  scoreBadge: { backgroundColor: '#059669', color: '#ffffff', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  reportSection: { marginTop: 12, padding: 10, backgroundColor: '#020617', borderRadius: 8 },
  reportSubtitle: { color: '#34d399', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  reportSubtitleWarn: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  reportItem: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  disclaimerBox: { marginTop: 16, padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  disclaimerTitle: { color: '#f87171', fontSize: 11, fontWeight: 'bold' },
  disclaimerText: { color: '#fca5a5', fontSize: 10, marginTop: 2, lineHeight: 14 }
});