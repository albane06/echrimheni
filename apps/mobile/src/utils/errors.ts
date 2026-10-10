/**
 * P7.13 / P1-12 — Traduction centralisée et bienveillante des erreurs utilisateur.
 * Supprime tout préfixe technique ([SupabaseError], code SQL, stack trace),
 * consigne les détails dans console.warn en mode dev pour le diagnostic.
 */
import { classifySupabaseError, type ServiceErrorKind } from '@echrimheni/database';

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function formatUserErrorMessage(t: TranslateFn, err: unknown): string {
  if (__DEV__) {
    // Diagnostic sécurisé en développement uniquement
    // eslint-disable-next-line no-console
    console.warn('[EchriMheni Error Diagnostic]', err);
  }

  const kind: ServiceErrorKind = classifySupabaseError(err);

  switch (kind) {
    case 'NETWORK':
      return t('errors.network');
    case 'AUTH':
      return t('errors.session');
    case 'FORBIDDEN':
      return t('errors.unauthorized');
    case 'NOT_FOUND':
      return t('errors.notFound');
    case 'VALIDATION':
      return t('errors.validation');
    case 'BUSINESS':
      return t('errors.business');
    case 'UNKNOWN':
    default:
      return t('errors.generic');
  }
}
