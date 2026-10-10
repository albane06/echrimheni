import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getCategories,
  uploadExpertDocument,
  submitMyExpertDocuments,
  updateMyExpertProfile,
  validateExpertOnboardingInput,
  classifySupabaseError,
} from '@echrimheni/database';
import { useBuyerAuth } from '../auth/BuyerAuthContext';
import { useLanguage } from '../i18n';

type Step = 'infos' | 'docs' | 'done';

interface PickedFile {
  uri: string;
  fileName: string;
  mimeType: string;
}

function errText(err: unknown): string {
  const kind = classifySupabaseError(err);
  switch (kind) {
    case 'NETWORK': return 'Erreur réseau : vérifiez votre connexion puis réessayez.';
    case 'AUTH': return 'Session expirée. Reconnectez-vous.';
    case 'FORBIDDEN': return 'Action non autorisée.';
    case 'NOT_FOUND': return 'Élément introuvable.';
    case 'VALIDATION': return 'Vérifiez les champs saisis.';
    case 'BUSINESS': return 'Opération impossible selon les règles de la plateforme.';
    default: return 'Une erreur est survenue. Réessayez dans un instant.';
  }
}

async function pickImage(): Promise<PickedFile | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (picked.canceled || !picked.assets || picked.assets.length === 0) return null;
  const asset = picked.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName || 'document.jpg',
    mimeType: asset.mimeType || 'image/jpeg',
  };
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}

/**
 * P6.7-A — Candidature expert : infos professionnelles + pièces CNI/RC.
 * Identité toujours dérivée de la session ; bucket privé ; statut forcé
 * PENDING côté service ; jamais d'URL publique. Appelé uniquement quand
 * getMyExpertDocument() est null (pas de resoumission aveugle).
 */
export function ExpertOnboardingScreen({ onSubmitted }: { onSubmitted: () => void }) {
  const { t } = useLanguage();
  const { profile, refresh } = useBuyerAuth();
  const [step, setStep] = useState<Step>('infos');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const [idType, setIdType] = useState('CNI');
  const [idNumber, setIdNumber] = useState('');
  const [idFile, setIdFile] = useState<PickedFile | null>(null);
  const [rcNumber, setRcNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessActivity, setBusinessActivity] = useState('');
  const [rcFile, setRcFile] = useState<PickedFile | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        setCategories((await getCategories()) || []);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const toggleSpecialty = (code: string) => {
    setSpecialties(prev => (prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]));
  };

  const goDocs = () => {
    setError(null);
    if (!fullName.trim() || !phone.trim() || !wilaya.trim()) {
      setError('[VALIDATION] Nom complet, téléphone et wilaya sont requis.');
      return;
    }
    if (specialties.length === 0) {
      setError(t('expertOnboarding.specRequired'));
      return;
    }
    setStep('docs');
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      validateExpertOnboardingInput({
        fullName,
        phone,
        wilaya,
        specialties,
        identityDocumentNumber: idNumber,
        businessRegistrationNumber: rcNumber,
        businessName,
        businessActivity,
        hasIdentityFile: idFile !== null,
        hasRegistrationFile: rcFile !== null,
      });
    } catch (err: unknown) {
      setError(errText(err));
      return;
    }
    if (!idFile || !rcFile) return;
    setBusy(true);
    try {
      // 1. Upload privé (dossier <uid>/…) — jamais d'URL publique.
      const [idUrl, rcUrl] = await Promise.all([
        (async () => uploadExpertDocument({
          fileName: idFile.fileName, mimeType: idFile.mimeType, data: await readBytes(idFile.uri),
        }))(),
        (async () => uploadExpertDocument({
          fileName: rcFile.fileName, mimeType: rcFile.mimeType, data: await readBytes(rcFile.uri),
        }))(),
      ]);
      // 2. Profil expert (update own autorisé RLS) puis dossier (INSERT, PENDING forcé).
      await updateMyExpertProfile({
        specialties,
        wilaya: wilaya.trim(),
        commune: commune.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      await submitMyExpertDocuments({
        identityDocumentUrl: idUrl,
        identityDocumentType: idType,
        identityDocumentNumber: idNumber.trim(),
        businessRegistrationUrl: rcUrl,
        businessRegistrationNumber: rcNumber.trim(),
        businessName: businessName.trim(),
        businessActivity: businessActivity.trim(),
      });
      await refresh();
      setStep('done');
      onSubmitted();
    } catch (err: unknown) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const activeCodes = categories.filter(c => (c as any).is_active !== false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerBadge}>{t('expertOnboarding.badge')}</Text>
        <Text style={styles.headerTitle}>{t('expertOnboarding.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {step === 'infos' ? `${t('expertOnboarding.stepCounter', { n: 1 })} — ${t('expertOnboarding.stepInfos')}` : step === 'docs' ? `${t('expertOnboarding.stepCounter', { n: 2 })} — ${t('expertOnboarding.stepDocs')}` : t('expertOnboarding.doneTitle')}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {step === 'infos' && (
        <View style={styles.card}>
          <Text style={styles.label}>{t('expertOnboarding.fullName')}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePh')} placeholderTextColor="#64748b" />
          <Text style={styles.label}>{t('expertOnboarding.phone')}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('auth.phonePh')} placeholderTextColor="#64748b" />
          <View style={styles.row}>
            <View style={{ flex: 1, marginEnd: 8 }}>
              <Text style={styles.label}>{t('expertOnboarding.wilaya')} *</Text>
              <TextInput style={styles.input} value={wilaya} onChangeText={setWilaya} placeholder={t('auth.wilayaPh')} placeholderTextColor="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('expertOnboarding.commune')}</Text>
              <TextInput style={styles.input} value={commune} onChangeText={setCommune} placeholder={t('auth.communePh')} placeholderTextColor="#64748b" />
            </View>
          </View>
          <Text style={styles.label}>{t('expertOnboarding.specialties')} *</Text>
          {activeCodes.length === 0 ? (
            <Text style={styles.emptyText}>{t('expertOnboarding.loadingSpecialties')}</Text>
          ) : (
            activeCodes.map(c => (
              <TouchableOpacity
                key={(c as any).id}
                style={[styles.pick, specialties.includes((c as any).code) && styles.pickActive]}
                onPress={() => toggleSpecialty((c as any).code)}
              >
                <Text style={styles.pickText}>{(c as any).name}</Text>
              </TouchableOpacity>
            ))
          )}
          <Text style={styles.label}>{t('expertOnboarding.bio')}</Text>
          <TextInput style={[styles.input, { minHeight: 64 }]} value={bio} onChangeText={setBio} multiline placeholder={t('expertOnboarding.bioPh')} placeholderTextColor="#64748b" />
          <TouchableOpacity style={styles.primaryButton} onPress={goDocs}>
            <Text style={styles.buttonText}>{t('expertOnboarding.continueDocs')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'docs' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('expertOnboarding.idTitle')}</Text>
          <View style={styles.row}>
            {['CNI', 'Passeport', 'Permis'].map(dt => (
              <TouchableOpacity
                key={dt}
                style={[styles.pick, idType === dt && styles.pickActive, { flex: 1, marginEnd: 6 }]}
                onPress={() => setIdType(dt)}
              >
                <Text style={styles.pickText}>{dt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>{t('expertOnboarding.idNumber')} *</Text>
          <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber} placeholder={t('expertOnboarding.idNumberPh')} placeholderTextColor="#64748b" />
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void pickImage().then(setIdFile)}>
            <Text style={styles.secondaryButtonText}>{idFile ? `✓ ${idFile.fileName}` : t('expertOnboarding.idPhotoPick')}</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('expertOnboarding.rcTitle')}</Text>
          <Text style={styles.label}>{t('expertOnboarding.businessName')} *</Text>
          <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder={t('expertOnboarding.businessNamePh')} placeholderTextColor="#64748b" />
          <Text style={styles.label}>{t('expertOnboarding.rcNumber')} *</Text>
          <TextInput style={styles.input} value={rcNumber} onChangeText={setRcNumber} placeholder={t('expertOnboarding.rcNumberPh')} placeholderTextColor="#64748b" />
          <Text style={styles.label}>{t('expertOnboarding.businessActivity')} *</Text>
          <TextInput style={styles.input} value={businessActivity} onChangeText={setBusinessActivity} placeholder={t('expertOnboarding.businessActivityPh')} placeholderTextColor="#64748b" />
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void pickImage().then(setRcFile)}>
            <Text style={styles.secondaryButtonText}>{rcFile ? `✓ ${rcFile.fileName}` : t('expertOnboarding.rcPhotoPick')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={() => void handleSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('expertOnboarding.submit')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('infos')} disabled={busy}>
            <Text style={styles.secondaryButtonText}>{t('expertOnboarding.backInfos')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('expertOnboarding.doneTitleShort')}</Text>
          <Text style={styles.subtext}>
            {t('expertOnboarding.doneMsgLong')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA', padding: 20 },
  header: { marginBottom: 16 },
  headerBadge: { color: '#1246A8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#0F1B2D', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  headerSubtitle: { color: '#5B6B82', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E3E8F0', marginBottom: 24 },
  sectionTitle: { color: '#0F1B2D', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtext: { color: '#5B6B82', fontSize: 12, marginBottom: 8, lineHeight: 18 },
  label: { color: '#5B6B82', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E8F0', borderRadius: 12, padding: 10, color: '#0F1B2D', fontSize: 13, minHeight: 48 },
  row: { flexDirection: 'row' },
  pick: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E3E8F0', minHeight: 48, justifyContent: 'center' },
  pickActive: { borderColor: '#1F5AC8', borderWidth: 2, backgroundColor: '#EEF3FC' },
  pickText: { color: '#5B6B82', fontSize: 12, fontWeight: '600' },
  primaryButton: { backgroundColor: '#EA580C', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16, minHeight: 48, justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderColor: '#1246A8', minHeight: 48, justifyContent: 'center' },
  secondaryButtonText: { color: '#1246A8', fontSize: 12, fontWeight: '600' },
  errorBanner: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#DC2626', padding: 10, borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: '#8A97AB', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
});


