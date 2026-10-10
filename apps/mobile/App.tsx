import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { BuyerTabs } from './src/screens/BuyerTabs';
import { ExpertScreen } from './src/screens/ExpertScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ExpertOnboardingScreen } from './src/screens/ExpertOnboardingScreen';
import { BuyerAuthProvider, useBuyerAuth } from './src/auth/BuyerAuthContext';
import { getMyExpertDocument } from '@echrimheni/database';
import { createChunkedSecureStore } from './src/auth/secureStorage';
import { getSupabaseClient, setDefaultAuthStorage } from '@echrimheni/database';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './src/components/Logo';
import { brandGradient, colors, spacing, type } from './src/theme/tokens';
import {
  markOnboardingCompleted,
  readOnboardingCompleted,
  resolveOnboardingVisibility,
} from './src/auth/onboarding';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useFonts as useInter } from '@expo-google-fonts/inter/useFonts';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts as useJakarta } from '@expo-google-fonts/plus-jakarta-sans/useFonts';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts as useCairo } from '@expo-google-fonts/cairo/useFonts';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import { LanguageProvider, useLanguage } from './src/i18n';
import type { ExpertVerificationStatus } from '@echrimheni/shared';
import { DesignShowcase, SHOWCASE_ENABLED } from './src/dev/DesignShowcase';

// P5 — Persistance session partagée par toutes les instances client mobile.
// Configurée une seule fois au démarrage ; aucun mot de passe n'y transite.
setDefaultAuthStorage(
  createChunkedSecureStore({
    getItemAsync: (key: string) => SecureStore.getItemAsync(key),
    setItemAsync: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
  })
);

function ExpertEntry({ expertId }: { expertId: string }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ExpertVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: queryError } = await supabase
          .from('expert_documents')
          .select('verification_status')
          .eq('expert_id', expertId)
          .maybeSingle();
        if (queryError) throw queryError;
        setStatus(((data as { verification_status: ExpertVerificationStatus } | null)?.verification_status) || 'PENDING');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement du statut expert.');
      } finally {
        setLoading(false);
      }
    })();
  }, [expertId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.centerText}>{t('expertOnboarding.loadingDossier')}</Text>
      </View>
    );
  }
  if (error || !status) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || t('expertOnboarding.statusNA')}</Text>
      </View>
    );
  }
  return <ExpertScreen expertId={expertId} initialVerificationStatus={status} />;
}

/**
 * P6.7-A — Porte d'entrée expert : sans dossier → candidature (onboarding) ;
 * avec dossier → parcours existant (attente PENDING / missions si APPROVED).
 * Aucun contournement : le statut reste lu depuis expert_documents.
 */
function ExpertGate({ expertId }: { expertId: string }) {
  const { t } = useLanguage();
  const [hasDossier, setHasDossier] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    try {
      setHasDossier((await getMyExpertDocument()) !== null);
    } catch {
      setHasDossier(null);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (hasDossier === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.centerText}>{t('expertOnboarding.checkingDossier')}</Text>
      </View>
    );
  }
  if (!hasDossier) {
    return <ExpertOnboardingScreen onSubmitted={() => void check()} />;
  }
  return <ExpertEntry expertId={expertId} />;
}

/**
 * P7.3 — Splash de marque affiché pendant le chargement initial
 * (polices + flag onboarding). Fond #071C45, logo blanc centré.
 */
function BrandSplash() {
  const { t, T } = useLanguage();
  return (
    <LinearGradient
      colors={[brandGradient.from, brandGradient.to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Logo variant="full" tone="white" height={56} />
      <Text style={[T.body, { color: colors.text.onDark, opacity: 0.8, marginTop: spacing.md }]}>
        {t('splash.tagline')}
      </Text>
      <View style={{ position: 'absolute', bottom: 64 }}>
        <ActivityIndicator color="#5EEAD4" />
      </View>
    </LinearGradient>
  );
}

/**
 * P7.3 — Ordre de démarrage : splash → onboarding (première ouverture,
 * jamais par-dessus une session) → Auth → Buyer/Expert. Le logout retourne
 * vers Auth, l'onboarding restant terminé.
 */
function EntryGate() {
  const { isAuthenticated, isLoading } = useBuyerAuth();
  const [flagLoaded, setFlagLoaded] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    readOnboardingCompleted(AsyncStorage).then((done) => {
      setCompleted(done);
      setFlagLoaded(true);
    });
  }, []);

  const visibility = resolveOnboardingVisibility({
    flagLoaded: flagLoaded && !isLoading,
    completed,
    isAuthenticated,
  });

  if (visibility === 'loading') {
    return <BrandSplash />;
  }
  if (visibility === 'show') {
    const finish = () => {
      void markOnboardingCompleted(AsyncStorage).then(() => setCompleted(true));
    };
    return <OnboardingScreen onDone={finish} />;
  }
  return <GatedApp />;
}

function GatedApp() {
  const { t } = useLanguage();
  const { isAuthenticated, role, sessionUserId, isLoading } = useBuyerAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#34d399" />
        <Text style={styles.centerText}>{t('session.checking')}</Text>
      </View>
    );
  }

  if (!isAuthenticated || !sessionUserId) {
    return <AuthScreen />;
  }

  if (role === 'BUYER') {
    return <BuyerTabs />;
  }
  if (role === 'EXPERT') {
    return <ExpertGate expertId={sessionUserId} />;
  }
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{t('session.roleForbiddenMobile')}</Text>
    </View>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppFonts />
    </LanguageProvider>
  );
}

/**
 * P7.1/P7.10 — Polices chargées avant tout affichage (anti-flash), Jakarta +
 * Inter + Cairo (arabe). Showcase dev désactivé en production.
 */
function AppFonts() {
  // P7.1 — Polices chargées avant tout affichage (anti-flash). Showcase dev
  // désactivé en production (SHOWCASE_ENABLED = false).
  const [jakartaLoaded] = useJakarta({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [cairoLoaded] = useCairo({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });
  if (SHOWCASE_ENABLED) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <DesignShowcase />
      </SafeAreaView>
    );
  }
  if (!jakartaLoaded || !interLoaded || !cairoLoaded) {
    return <BrandSplash />;
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
      <BuyerAuthProvider>
        <EntryGate />
      </BuyerAuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { flex: 1 },
  sessionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: '#0f172a' },
  sessionText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  logoutText: { color: '#f87171', fontSize: 11, fontWeight: 'bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { color: '#94a3b8', marginTop: 8, fontSize: 12 },
  errorText: { color: '#f87171', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
});
