/**
 * P7.2/P7.10/P7.32.2 — AuthScreen : Inscription & Connexion sécurisées avec gestion Cas A/B/C.
 */
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react-native';
import { useBuyerAuth } from '../auth/BuyerAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/Logo';
import { colors, spacing } from '../theme/tokens';
import { useLanguage } from '../i18n';

export function AuthScreen() {
  const { t, T, isRTL } = useLanguage();
  const {
    signIn,
    signUpBuyer,
    signUpExpert,
    error,
    errorKind,
    info,
    setInfo,
    clearError,
    isLoading,
  } = useBuyerAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [accountType, setAccountType] = useState<'BUYER' | 'EXPERT'>('BUYER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    clearError();
    setInfo(null);
  };

  const submit = async () => {
    if (busy || isLoading) return;
    setBusy(true);
    clearError();
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (accountType === 'EXPERT') {
        const res = await signUpExpert(email, password, fullName, phone, wilaya, commune);
        if (res.needsEmailConfirmation) {
          setMode('signin');
          setPassword('');
        }
      } else {
        const res = await signUpBuyer(email, password, fullName, phone);
        if (res.needsEmailConfirmation) {
          setMode('signin');
          setPassword('');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const isFormLocked = busy || isLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.app }}
      contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <Logo variant="full" tone="color" height={48} />
      </View>
      <Text style={[T.h1, { color: colors.text.primary, textAlign: 'center' }]}>
        {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
      </Text>
      <Text style={[T.body, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg }]}>
        {t('auth.subtitle')}
      </Text>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: colors.bg.subtle, borderRadius: 12, padding: 3, marginBottom: spacing.lg }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: mode === 'signin' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
          onPress={() => switchMode('signin')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'signin' }}
          accessibilityLabel={t('auth.signinTab')}
          disabled={isFormLocked}
        >
          <Text style={[T.bodyStrong, { color: mode === 'signin' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.signinTab')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: mode === 'signup' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
          onPress={() => switchMode('signup')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'signup' }}
          accessibilityLabel={t('auth.signupTab')}
          disabled={isFormLocked}
        >
          <Text style={[T.bodyStrong, { color: mode === 'signup' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.signupTab')}</Text>
        </TouchableOpacity>
      </View>

      {info ? (
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.success.bg,
            borderRadius: 12,
            padding: spacing.md,
            marginBottom: spacing.md,
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.success.main,
          }}
          accessibilityRole="alert"
        >
          <CheckCircle2 size={18} color={colors.success.main} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text style={[T.caption, { color: colors.success.text, flex: 1, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }]}>
            {t(info)}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.danger.bg,
            borderRadius: 12,
            padding: spacing.md,
            marginBottom: spacing.md,
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.danger.main,
          }}
          accessibilityRole="alert"
        >
          <AlertTriangle size={18} color={colors.danger.main} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text style={[T.caption, { color: colors.danger.text, flex: 1, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }]}>
            {errorKind === 'NETWORK' && error !== 'errors.network' ? `${t('errors.network')} : ` : ''}
            {t(error)}
          </Text>
        </View>
      ) : null}

      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder={t('auth.emailPh')}
        editable={!isFormLocked}
      />
      <View style={{ height: spacing.sm }} />
      <Input
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={t('auth.passwordPh')}
        editable={!isFormLocked}
      />

      {mode === 'signup' && (
        <>
          <Text style={[T.caption, { color: colors.text.secondary, marginTop: spacing.md, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.accountType')}</Text>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: colors.bg.subtle, borderRadius: 12, padding: 3, marginBottom: spacing.sm }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: accountType === 'BUYER' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
              onPress={() => setAccountType('BUYER')}
              accessibilityRole="tab"
              accessibilityState={{ selected: accountType === 'BUYER' }}
              accessibilityLabel={t('auth.buyer')}
              disabled={isFormLocked}
            >
              <Text style={[T.bodyStrong, { color: accountType === 'BUYER' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.buyer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: accountType === 'EXPERT' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
              onPress={() => setAccountType('EXPERT')}
              accessibilityRole="tab"
              accessibilityState={{ selected: accountType === 'EXPERT' }}
              accessibilityLabel={t('auth.expert')}
              disabled={isFormLocked}
            >
              <Text style={[T.bodyStrong, { color: accountType === 'EXPERT' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.expert')}</Text>
            </TouchableOpacity>
          </View>
          <Input label={t('auth.fullName')} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePh')} editable={!isFormLocked} />
          <View style={{ height: spacing.sm }} />
          <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('auth.phonePh')} helper={t('auth.phoneHelper')} editable={!isFormLocked} />
          {accountType === 'EXPERT' && (
            <>
              <View style={{ height: spacing.sm }} />
              <Input label={t('auth.wilaya')} value={wilaya} onChangeText={setWilaya} placeholder={t('auth.wilayaPh')} editable={!isFormLocked} />
              <View style={{ height: spacing.sm }} />
              <Input label={t('auth.commune')} value={commune} onChangeText={setCommune} placeholder={t('auth.communePh')} editable={!isFormLocked} />
            </>
          )}
        </>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          title={isFormLocked ? t('common.pleaseWait') : mode === 'signin' ? t('auth.signIn') : accountType === 'EXPERT' ? t('auth.createExpert') : t('auth.createBuyer')}
          onPress={() => void submit()}
          loading={isFormLocked}
          disabled={isFormLocked}
        />
      </View>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, gap: 4 }}>
        <Lock size={14} color={colors.text.secondary} strokeWidth={1.75} />
        <Text style={[T.caption, { color: colors.text.secondary }]}>{t('auth.secured')}</Text>
      </View>
    </ScrollView>
  );
}
