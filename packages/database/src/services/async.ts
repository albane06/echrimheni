/**
 * P67-FIX — Utilitaires async de robustesse (aucun accès réseau).
 *
 * - shareInFlight : plusieurs appels concurrents partagent la même Promise
 *   en vol au lieu de lancer N vérifications (StrictMode, INITIAL_SESSION).
 * - withTimeout : un appel distant ne doit jamais laisser un loading infini ;
 *   passé le délai, rejet explicite, session locale préservée (pas de logout).
 */

/** Délai maximal d'une vérification de session avant erreur explicite. */
export const VERIFY_TIMEOUT_MS = 12000;

/** Message affiché quand Supabase ne répond pas dans le délai imparti. */
export const SUPABASE_VERIFY_TIMEOUT_MESSAGE =
  'Impossible de joindre Supabase. Vérifiez votre connexion puis réessayez.';

/**
 * Partage la Promise en vol : tant qu'un appel est en cours, les appels
 * concurrents reçoivent la même Promise au lieu de relancer le travail.
 */
export function shareInFlight<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  let current: Promise<TResult> | null = null;
  return (...args: TArgs): Promise<TResult> => {
    if (!current) {
      current = fn(...args).finally(() => {
        current = null;
      });
    }
    return current;
  };
}

/**
 * Rejette après `ms` millisecondes si `promise` n'a pas abouti.
 * Le timer est nettoyé dès que la promesse se règle (pas de fuite).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([
    promise.finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    }),
    timeout,
  ]);
}
