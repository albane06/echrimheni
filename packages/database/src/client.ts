import { createClient } from '@supabase/supabase-js';

/**
 * P1 — Supabase client strict (AUCUN fallback silencieux).
 *
 * CLIENT (navigateur / Expo) :
 *   SUPABASE_URL = NEXT_PUBLIC_SUPABASE_URL | EXPO_PUBLIC_SUPABASE_URL
 *   ANON KEY     = NEXT_PUBLIC_SUPABASE_ANON_KEY
 *                | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *                | EXPO_PUBLIC_SUPABASE_ANON_KEY
 *                | EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * SERVER (exclusivement côté serveur) :
 *   SUPABASE_SERVICE_ROLE_KEY (JAMAIS préfixée par NEXT_PUBLIC_ / EXPO_PUBLIC_)
 *
 * Si les variables sont absentes -> throw explicite
 * `SUPABASE_CONFIGURATION_REQUIRED`. Jamais de clé fictive.
 */
export const SUPABASE_CONFIGURATION_REQUIRED =
  'SUPABASE_CONFIGURATION_REQUIRED: missing Supabase environment variables. ' +
  'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (browser) ' +
  'and SUPABASE_SERVICE_ROLE_KEY (server only). See apps/web-admin/.env.local.example.';

/**
 * P5 — Stockage Auth injectable (React Native / Expo SecureStore).
 * Interface compatible supabase-js (sync ou Promise). Le web n'appelle
 * jamais le setter et conserve le comportement par défaut (localStorage).
 */
export interface SupabaseAuthStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

let defaultAuthStorage: SupabaseAuthStorage | null = null;

export function setDefaultAuthStorage(storage: SupabaseAuthStorage | null): void {
  defaultAuthStorage = storage;
}

export function getDefaultAuthStorage(): SupabaseAuthStorage | null {
  return defaultAuthStorage;
}

export function resolveSupabaseUrl(explicitUrl?: string): string {
  const url =
    explicitUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(SUPABASE_CONFIGURATION_REQUIRED + ' (Supabase URL manquante)');
  }
  return url;
}

export function resolveSupabaseAnonKey(explicitKey?: string): string {
  const key =
    explicitKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(SUPABASE_CONFIGURATION_REQUIRED + ' (clé anon/publishable manquante)');
  }
  return key;
}

export function isSupabaseConfigured(): boolean {
  try {
    resolveSupabaseUrl();
    resolveSupabaseAnonKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Client navigateur / Expo. Persist la session (refresh auto).
 * Throw si configuration absente — ne retourne JAMAIS un client factice.
 *
 * P67-FIX — Singleton navigateur : dans un navigateur (window définie),
 * la même instance est retournée à chaque appel avec les mêmes paramètres
 * implicites, au lieu de créer un nouveau GoTrueClient à chaque fois
 * (warning "Multiple GoTrueClient instances", listeners/refresh dupliqués).
 * Côté serveur (aucun window) et avec paramètres explicites : comportement
 * inchangé, nouvelle instance à chaque appel (pas de fuite entre requêtes).
 */
type SupabaseClient = ReturnType<typeof createClient>;

let browserClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(supabaseUrl?: string, supabaseKey?: string, storage?: SupabaseAuthStorage) {
  const url = resolveSupabaseUrl(supabaseUrl);
  const key = resolveSupabaseAnonKey(supabaseKey);

  const browserGlobal = globalThis as unknown as { window?: unknown };
  const isBrowser = typeof browserGlobal.window !== 'undefined';
  const useCache = isBrowser && supabaseUrl === undefined && supabaseKey === undefined && storage === undefined;
  if (useCache) {
    if (!browserClientInstance) {
      browserClientInstance = createClient(url, key, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          storage: defaultAuthStorage || undefined
        }
      });
    }
    return browserClientInstance;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: storage || defaultAuthStorage || undefined
    }
  });
}

/**
 * Réinitialise le singleton navigateur. Réservé aux tests : évite les fuites
 * d'instance entre cas de test. Ne jamais appeler en production.
 */
export function resetSupabaseBrowserClientCache(): void {
  browserClientInstance = null;
}

/** Alias explicite pour le code navigateur. */
export function getSupabaseBrowserClient(supabaseUrl?: string, supabaseKey?: string) {
  return getSupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * Client serveur avec service_role. SERVER ONLY.
 * - Refuse de tourner dans un navigateur (garde-fou anti-fuite).
 * - N'accepte JAMAIS une clé exposée via NEXT_PUBLIC_* / EXPO_PUBLIC_*.
 * - Throw si SUPABASE_SERVICE_ROLE_KEY absente.
 */
export function getSupabaseAdminClient(supabaseUrl?: string, serviceRoleKey?: string) {
  const browserGlobal = globalThis as unknown as { window?: unknown };
  if (typeof browserGlobal.window !== 'undefined') {
    throw new Error(
      'SECURITY: getSupabaseAdminClient() must NEVER be called in the browser. service_role is server-only.'
    );
  }
  const url = resolveSupabaseUrl(
    supabaseUrl || process.env.SUPABASE_URL
  );
  const key = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(SUPABASE_CONFIGURATION_REQUIRED + ' (SUPABASE_SERVICE_ROLE_KEY manquante, server only)');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
