/**
 * P7.2/P7.10 — Profil : logique strictement inchangée + sélecteur de langue
 * (Français/العربية/English, persistant). P6.7-B : profil propre uniquement.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, Pressable, View } from 'react-native';
import { Bell, Globe, HelpCircle, LogOut, User } from 'lucide-react-native';
import {
  getCategories,
  getMyExpertDocument,
  getMyExpertProfile,
  updateMyExpertProfile,
  updateMyProfile,
  classifySupabaseError,
} from '@echrimheni/database';
import { useBuyerAuth } from '../auth/BuyerAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, StatusBadge } from '../components/ui/Cards';
import { Skeleton } from '../components/ui/Chrome';
import { colors, spacing } from '../theme/tokens';
import { useLanguage, type AppLang } from '../i18n';
import { formatUserErrorMessage } from '../utils/errors';

const LANG_OPTIONS: { key: AppLang; labelKey: 'profile.langFrench' | 'profile.langArabic' | 'profile.langEnglish' }[] = [
  { key: 'fr', labelKey: 'profile.langFrench' },
  { key: 'ar', labelKey: 'profile.langArabic' },
  { key: 'en', labelKey: 'profile.langEnglish' },
];

export function ProfileScreen() {
  const { t, T, lang, setLang } = useLanguage();
  const { profile, sessionEmail, role, refresh, signOut } = useBuyerAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [dossier, setDossier] = useState<{
    verification_status: string;
    rejection_reason: string | null;
    created_at: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, doc, expert] = await Promise.all([
        role === 'EXPERT' ? getCategories() : Promise.resolve([]),
        role === 'EXPERT' ? getMyExpertDocument() : Promise.resolve(null),
        role === 'EXPERT' ? getMyExpertProfile().catch(() => null) : Promise.resolve(null),
      ]);
      setCategories(cats || []);
      setDossier(doc as never);
      setFullName(profile?.full_name || '');
      setPhone(profile?.phone || '');
      if (expert) {
        setWilaya((expert as any).wilaya || '');
        setCommune((expert as any).commune || '');
        setBio((expert as any).bio || '');
        setSpecialties(Array.isArray((expert as any).specialties) ? (expert as any).specialties : []);
      }
    } catch (err: unknown) {
      setError(formatUserErrorMessage(t, err));
    } finally {
      setLoading(false);
    }
  }, [role, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSpecialty = (code: string) => {
    setSpecialties(prev => (prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]));
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!fullName.trim() || !phone.trim()) {
      setError(t('profile.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({ fullName: fullName.trim(), phone: phone.trim() });
      if (role === 'EXPERT') {
        await updateMyExpertProfile({
          specialties,
          wilaya: wilaya.trim() || undefined,
          commune: commune.trim() || undefined,
          bio: bio.trim() || undefined,
        });
      }
      await refresh();
      setSaved(true);
    } catch (err: unknown) {
      setError(formatUserErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg.app }}
        contentContainerStyle={{ padding: spacing.screen }}
      >
        <View accessibilityRole="text" accessibilityLabel={t('profile.loading')}>
          <Skeleton width={64} height={64} />
          <View style={{ height: spacing.md }} />
          <Card>
            <Skeleton width="70%" height={20} />
            <View style={{ height: 8 }} />
            <Skeleton width="90%" height={48} />
          </Card>
        </View>
      </ScrollView>
    );
  }

  const activeCodes = categories.filter(c => (c as any).is_active !== false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.app }}
      contentContainerStyle={{ padding: spacing.screen, paddingBottom: spacing.xxl }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.md }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primary[50],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={28} color={colors.primary[600]} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[T.h2, { color: colors.text.primary }]}>
            {fullName || sessionEmail || t('profile.nameFallback')}
          </Text>
          <Text style={[T.caption, { color: colors.text.secondary }]}>{sessionEmail || ''}</Text>
          {role ? (
            <View style={{ marginTop: 4 }}>
              <StatusBadge status={role === 'ADMIN' ? 'confirmed' : role === 'BUYER' ? 'expert_assigned' : 'in_inspection'} />
            </View>
          ) : null}
        </View>
      </View>

      <Card>
        <Text style={[T.h3, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('profile.title')}</Text>
        {error ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[T.caption, { color: colors.danger.main }]}>{error}</Text>
            <View style={{ marginTop: spacing.sm }}>
              <Button title={t('profile.retry')} variant="outline" compact onPress={() => void load()} />
            </View>
          </View>
        ) : null}
        <Text style={[T.caption, { color: colors.text.secondary, marginBottom: 2 }]}>{t('profile.emailRO')}</Text>
        <Text style={[T.body, { color: colors.text.secondary, marginBottom: spacing.sm }]}>{sessionEmail || '—'}</Text>
        <Text style={[T.caption, { color: colors.text.secondary, marginBottom: 2 }]}>{t('profile.roleRO')}</Text>
        <Text style={[T.body, { color: colors.text.secondary, marginBottom: spacing.sm }]}>{role || '—'}</Text>
        <Input label={t('profile.fullName')} value={fullName} onChangeText={(v) => { setFullName(v); setSaved(false); }} placeholder={t('auth.fullNamePh')} />
        <View style={{ height: spacing.sm }} />
        <Input label={t('profile.phone')} value={phone} onChangeText={(v) => { setPhone(v); setSaved(false); }} keyboardType="phone-pad" placeholder={t('auth.phonePh')} />
      </Card>

      {role === 'EXPERT' && (
        <View style={{ marginTop: spacing.lg }}>
          <Card>
            <Text style={[T.h3, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('profile.expertInfo')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.wilaya')} value={wilaya} onChangeText={setWilaya} placeholder={t('auth.wilayaPh')} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.commune')} value={commune} onChangeText={setCommune} placeholder={t('auth.communePh')} />
              </View>
            </View>
            <Text style={[T.caption, { color: colors.text.secondary, marginTop: spacing.md, marginBottom: 4 }]}>{t('profile.specialties')}</Text>
            {activeCodes.map(c => {
              const active = specialties.includes((c as any).code);
              return (
                <TouchableOpacity
                  key={(c as any).id}
                  onPress={() => toggleSpecialty((c as any).code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={(c as any).name}
                  style={{
                    backgroundColor: active ? colors.primary[50] : colors.bg.card,
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 6,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? colors.primary[500] : colors.border.default,
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[T.caption, { color: active ? colors.primary[700] : colors.text.secondary, fontWeight: '600' }]}>
                    {(c as any).name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: spacing.sm }} />
            <Input label={t('profile.bio')} value={bio} onChangeText={setBio} multiline placeholder={t('profile.bioPh')} />
            <Text style={[T.h3, { color: colors.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              {t('profile.dossierRO')}
            </Text>
            {!dossier ? (
              <Text style={[T.caption, { color: colors.text.muted, fontStyle: 'italic' }]}>{t('profile.noDossier')}</Text>
            ) : (
              <>
                <StatusBadge status={dossier.verification_status === 'APPROVED' ? 'confirmed' : dossier.verification_status === 'REJECTED' ? 'failed' : 'pending'} />
                <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>
                  {t('profile.submittedOn', { date: new Date(dossier.created_at).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR') })}
                </Text>
                {dossier.verification_status === 'REJECTED' && dossier.rejection_reason && (
                  <Text style={[T.caption, { color: colors.text.secondary, marginTop: 4 }]}>{t('profile.rejectReason', { reason: dossier.rejection_reason })}</Text>
                )}
                <Text style={[T.caption, { color: colors.text.muted, fontStyle: 'italic', marginTop: 4 }]}>
                  {t('profile.privateNote')}
                </Text>
              </>
            )}
          </Card>
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button title={saving ? t('profile.saving') : t('profile.save')} onPress={() => void handleSave()} loading={saving} />
        {saved ? (
          <Text style={[T.caption, { color: colors.success.text, fontWeight: 'bold', textAlign: 'center', marginTop: spacing.sm }]}>
            {t('profile.saved')}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, opacity: 0.55 }}>
            <Bell size={20} color={colors.text.secondary} strokeWidth={1.75} />
            <Text style={[T.body, { color: colors.text.secondary }]}>{t('profileRows.notifications')}</Text>
          </View>
          <View style={{ paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Globe size={20} color={colors.text.secondary} strokeWidth={1.75} />
              <Text style={[T.body, { color: colors.text.primary }]}>{t('profile.language')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={t('profile.language')}>
              {LANG_OPTIONS.map((o) => {
                const active = o.key === lang;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => void setLang(o.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={t(o.labelKey)}
                    style={{
                      flex: 1,
                      backgroundColor: active ? colors.primary[50] : colors.bg.card,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? colors.primary[500] : colors.border.default,
                      borderRadius: 12,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={[T.bodyStrong, { color: active ? colors.primary[700] : colors.text.secondary }]}>
                      {t(o.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, opacity: 0.55 }}>
            <HelpCircle size={20} color={colors.text.secondary} strokeWidth={1.75} />
            <Text style={[T.body, { color: colors.text.secondary }]}>{t('profileRows.help')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('expert.signOutConfirmTitle'),
                t('expert.signOutConfirmMsg'),
                [
                  { text: t('expert.signOutCancel'), style: 'cancel' },
                  { text: t('expert.signOutConfirm'), style: 'destructive', onPress: () => void signOut() },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={t('profileRows.logout')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, minHeight: 48 }}
          >
            <LogOut size={20} color={colors.danger.main} strokeWidth={1.75} />
            <Text style={[T.bodyStrong, { color: colors.danger.main }]}>{t('profileRows.logout')}</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}
