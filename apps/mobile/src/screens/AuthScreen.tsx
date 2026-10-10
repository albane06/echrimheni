/**
 * P7.2/P7.10 — AuthScreen : mécanisme email/password CONSERVÉ, présentation i18n.
 */
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useBuyerAuth } from '../auth/BuyerAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/Logo';
import { colors, spacing } from '../theme/tokens';
import { useLanguage } from '../i18n';

export function AuthScreen() {
  const { t, T } = useLanguage();
  const { signIn, signUpBuyer, signUpExpert, error, errorKind, isLoading } = useBuyerAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [accountType, setAccountType] = useState<'BUYER' | 'EXPERT'>('BUYER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (accountType === 'EXPERT') {
        await signUpExpert(email, password, fullName, phone, wilaya, commune);
      } else {
        await signUpBuyer(email, password, fullName, phone);
      }
    } finally {
      setBusy(false);
    }
  };

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

      <View style={{ flexDirection: 'row', backgroundColor: colors.bg.subtle, borderRadius: 12, padding: 3, marginBottom: spacing.lg }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: mode === 'signin' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
          onPress={() => setMode('signin')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'signin' }}
          accessibilityLabel={t('auth.signinTab')}
        >
          <Text style={[T.bodyStrong, { color: mode === 'signin' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.signinTab')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: mode === 'signup' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
          onPress={() => setMode('signup')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'signup' }}
          accessibilityLabel={t('auth.signupTab')}
        >
          <Text style={[T.bodyStrong, { color: mode === 'signup' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.signupTab')}</Text>
        </TouchableOpacity>
      </View>

      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder={t('auth.emailPh')}
      />
      <View style={{ height: spacing.sm }} />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry placeholder={t('auth.passwordPh')} />

      {mode === 'signup' && (
        <>
          <Text style={[T.caption, { color: colors.text.secondary, marginTop: spacing.md, marginBottom: 4 }]}>{t('auth.accountType')}</Text>
          <View style={{ flexDirection: 'row', backgroundColor: colors.bg.subtle, borderRadius: 12, padding: 3, marginBottom: spacing.sm }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: accountType === 'BUYER' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
              onPress={() => setAccountType('BUYER')}
              accessibilityRole="tab"
              accessibilityState={{ selected: accountType === 'BUYER' }}
              accessibilityLabel={t('auth.buyer')}
            >
              <Text style={[T.bodyStrong, { color: accountType === 'BUYER' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.buyer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, backgroundColor: accountType === 'EXPERT' ? colors.bg.card : 'transparent', minHeight: 48, justifyContent: 'center' }}
              onPress={() => setAccountType('EXPERT')}
              accessibilityRole="tab"
              accessibilityState={{ selected: accountType === 'EXPERT' }}
              accessibilityLabel={t('auth.expert')}
            >
              <Text style={[T.bodyStrong, { color: accountType === 'EXPERT' ? colors.primary[600] : colors.text.secondary }]}>{t('auth.expert')}</Text>
            </TouchableOpacity>
          </View>
          <Input label={t('auth.fullName')} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePh')} />
          <View style={{ height: spacing.sm }} />
          <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('auth.phonePh')} helper={t('auth.phoneHelper')} />
          {accountType === 'EXPERT' && (
            <>
              <View style={{ height: spacing.sm }} />
              <Input label={t('auth.wilaya')} value={wilaya} onChangeText={setWilaya} placeholder={t('auth.wilayaPh')} />
              <View style={{ height: spacing.sm }} />
              <Input label={t('auth.commune')} value={commune} onChangeText={setCommune} placeholder={t('auth.communePh')} />
            </>
          )}
        </>
      )}

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 4 }}>
          <Lock size={14} color={colors.danger.main} strokeWidth={1.75} />
          <Text style={[T.caption, { color: colors.danger.main }]}>
            {errorKind === 'NETWORK' ? `${t('errors.network')} ` : errorKind === 'VALIDATION' ? `${t('errors.validation')} ` : ''}
            {error}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          title={busy || isLoading ? t('common.pleaseWait') : mode === 'signin' ? t('auth.signIn') : accountType === 'EXPERT' ? t('auth.createExpert') : t('auth.createBuyer')}
          onPress={() => void submit()}
          loading={busy || isLoading}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, gap: 4 }}>
        <Lock size={14} color={colors.text.secondary} strokeWidth={1.75} />
        <Text style={[T.caption, { color: colors.text.secondary }]}>{t('auth.secured')}</Text>
      </View>
    </ScrollView>
  );
}
