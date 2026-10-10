/**
 * P7.10 — Internationalisation FR/AR/EN (léger, sans librairie externe).
 * - `fr` = référence + fallback ; parité `ar`/`en` garantie par le type.
 * - Persistance `echrimheni.language` (fr|ar|en, fallback fr).
 * - RTL réel : `I18nManager.forceRTL` + reload via `expo-updates` lors d'un
 *   changement de direction (sans reload, RN ne rebascule pas le layout).
 * - Typographie : Jakarta/Inter en fr/en, Cairo en ar (mêmes graisses).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { font as baseFont, type as baseType } from '../theme/tokens';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { fr, type FrDict } from './locales/fr';

export type AppLang = 'fr' | 'ar' | 'en';
export const LANGUAGE_KEY = 'echrimheni.language';
export const DEFAULT_LANG: AppLang = 'fr';

const DICTS: Record<AppLang, FrDict> = { fr, ar, en };

/** Tag de locale par langue (prix/dates). */
export const LOCALE_TAG: Record<AppLang, string> = { fr: 'fr-DZ', ar: 'ar-DZ', en: 'en-US' };

function normalizeLang(raw: string | null | undefined): AppLang {
  return raw === 'ar' || raw === 'en' || raw === 'fr' ? raw : DEFAULT_LANG;
}

type NestedLeaf = string;
type Nested = { [k: string]: NestedLeaf | Nested };

function lookup(dict: Nested, path: string): string | null {
  const parts = path.split('.');
  let node: NestedLeaf | Nested = dict;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return null;
    node = (node as Nested)[part];
    if (node === undefined) return null;
  }
  return typeof node === 'string' ? node : null;
}

export function translate(lang: AppLang, path: string, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[lang] as unknown as Nested, path) ?? lookup(DICTS.fr as unknown as Nested, path) ?? path;
  if (!vars) return raw;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
}

/** Familles Cairo mappées sur les graisses latines (même rôle visuel). */
const AR_FONT_MAP: Record<string, string> = {
  [baseFont.heading]: 'Cairo_700Bold',
  [baseFont.headingXL]: 'Cairo_800ExtraBold',
  [baseFont.semibold]: 'Cairo_600SemiBold',
  [baseFont.body]: 'Cairo_400Regular',
  [baseFont.bodyMedium]: 'Cairo_500Medium',
  [baseFont.bodySemibold]: 'Cairo_600SemiBold',
};

type TypeScale = typeof baseType;

/** Échelle typo résolue pour la langue (Cairo enar, sinon Jakarta/Inter). */
export function resolveType(lang: AppLang): TypeScale {
  if (lang !== 'ar') return baseType;
  const out: Record<string, Record<string, string | number>> = {};
  for (const [styleName, style] of Object.entries(baseType)) {
    const row: Record<string, string | number> = { ...(style as Record<string, string | number>) };
    const fam = row.fontFamily;
    if (typeof fam === 'string' && AR_FONT_MAP[fam]) row.fontFamily = AR_FONT_MAP[fam];
    out[styleName] = row;
  }
  return out as unknown as TypeScale;
}

interface LanguageContextValue {
  lang: AppLang;
  isRTL: boolean;
  localeTag: string;
  t: (path: string, vars?: Record<string, string | number>) => string;
  T: TypeScale;
  setLang: (lang: AppLang) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  isRTL: false,
  localeTag: LOCALE_TAG.fr,
  t: (path, vars) => translate(DEFAULT_LANG, path, vars),
  T: baseType,
  setLang: async () => {},
});

I18nManager.allowRTL(true);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((raw) => setLangState(normalizeLang(raw)))
      .catch(() => setLangState(DEFAULT_LANG))
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback(
    async (next: AppLang) => {
      const target = normalizeLang(next);
      const directionChanged = (target === 'ar') !== (lang === 'ar');
      await AsyncStorage.setItem(LANGUAGE_KEY, target);
      if (!directionChanged) {
        setLangState(target);
        return;
      }
      // Changement de direction : persister puis recharger pour un vrai RTL.
      I18nManager.forceRTL(target === 'ar');
      try {
        await Updates.reloadAsync();
      } catch {
        setLangState(target);
      }
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      isRTL: lang === 'ar' || I18nManager.isRTL,
      localeTag: LOCALE_TAG[lang],
      t: (path, vars) => translate(lang, path, vars),
      T: resolveType(lang),
      setLang,
    }),
    [lang, setLang],
  );

  if (!ready) return null;
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
