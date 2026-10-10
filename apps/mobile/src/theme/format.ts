/**
 * P7.1/P7.4/P7.10 — Formatage d'affichage : montants et dates par langue.
 * Présentation uniquement, jamais de calcul métier. `lang` optionnelle,
 * défaut FR (non-régression des usages existants).
 */

export type FormatLang = 'fr' | 'ar' | 'en';

const LOCALES: Record<FormatLang, string> = { fr: 'fr-DZ', ar: 'ar-DZ', en: 'en-US' };
const CURRENCY_WORD: Record<FormatLang, string> = { fr: 'DA', ar: 'دج', en: 'DZD' };

export function formatPrice(amount: number | null | undefined, lang: FormatLang = 'fr'): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  try {
    return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(amount)} ${CURRENCY_WORD[lang]}`;
  } catch {
    return `${amount} ${CURRENCY_WORD[lang]}`;
  }
}

export function formatPriceDA(amount: number | null | undefined): string {
  return formatPrice(amount, 'fr');
}

export function formatDate(
  iso: string | null | undefined,
  lang: FormatLang = 'fr',
  style: 'short' | 'long' = 'short',
): string {
  if (!iso) return '—';
  try {
    if (style === 'long') {
      return new Date(iso).toLocaleDateString(LOCALES[lang], {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    return new Date(iso).toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

export function formatDateShort(iso: string | null | undefined): string {
  return formatDate(iso, 'fr', 'short');
}

export function formatDateLong(iso: string | null | undefined): string {
  return formatDate(iso, 'fr', 'long');
}
