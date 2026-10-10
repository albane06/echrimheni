/**
 * P7.3 — État d'onboarding (premier lancement). Logique pure + persistance
 * injectée : aucune donnée personnelle, uniquement le flag d'affichage.
 * Règles : jamais d'onboarding par-dessus une session connectée ;
 * le logout ne réactive jamais l'onboarding.
 */

export const ONBOARDING_KEY = '@echrimheni/onboarding-completed';
const DONE_VALUE = 'true';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** `true` uniquement si le flag vaut exactement `"true"`. */
export function isOnboardingCompleted(raw: string | null | undefined): boolean {
  return raw === DONE_VALUE;
}

export async function readOnboardingCompleted(storage: KeyValueStorage): Promise<boolean> {
  try {
    return isOnboardingCompleted(await storage.getItem(ONBOARDING_KEY));
  } catch {
    // Stockage illisible : ne pas bloquer l'entrée, ne pas forcer l'onboarding.
    return true;
  }
}

export async function markOnboardingCompleted(storage: KeyValueStorage): Promise<void> {
  await storage.setItem(ONBOARDING_KEY, DONE_VALUE);
}

export type OnboardingVisibility = 'loading' | 'show' | 'done';

/**
 * Décision d'affichage pure :
 * - flag inconnu (chargement) → 'loading' (splash, jamais d'onboarding forcé) ;
 * - session connectée → 'done' (l'onboarding ne passe jamais par-dessus) ;
 * - sinon flag stocké.
 */
export function resolveOnboardingVisibility(input: {
  flagLoaded: boolean;
  completed: boolean;
  isAuthenticated: boolean;
}): OnboardingVisibility {
  if (input.isAuthenticated) return 'done';
  if (!input.flagLoaded) return 'loading';
  return input.completed ? 'done' : 'show';
}
