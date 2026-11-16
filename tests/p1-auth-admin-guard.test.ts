import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  resolveAdminAccess,
  resolveAdminEmail,
  SUPABASE_CONFIGURATION_REQUIRED,
  isSupabaseConfigured,
  resolveSupabaseUrl,
  resolveSupabaseAnonKey
} from '@echrimheni/database';
import type { Profile } from '@echrimheni/shared';

// Fixtures de test explicites — ne prétendent PAS être une connexion Supabase live.
function fixtureProfile(role: Profile['role'], id = 'user-admin-001'): Profile {
  return {
    id,
    role,
    full_name: 'Utilisateur Fixture',
    phone: '0550123456',
    created_at: new Date().toISOString()
  };
}

describe('P1 — Auth Admin réelle : autorisation', () => {
  it('TEST 1 — utilisateur non authentifié -> accès refusé', () => {
    const decision = resolveAdminAccess({ sessionUser: null, profile: null });
    expect(decision.allowed).toBe(false);
    expect(decision.isAuthenticated).toBe(false);
    expect(decision.reason).toBe('NO_SESSION');
  });

  it('TEST 2 — BUYER authentifié -> accès refusé', () => {
    const sessionUser = { id: 'buyer-001', email: 'buyer@exemple.dz' };
    const decision = resolveAdminAccess({ sessionUser, profile: fixtureProfile('BUYER', 'buyer-001') });
    expect(decision.allowed).toBe(false);
    expect(decision.isAuthenticated).toBe(true);
    expect(decision.reason).toBe('ROLE_BUYER_DENIED');
  });

  it('TEST 3 — EXPERT authentifié -> accès refusé', () => {
    const sessionUser = { id: 'expert-001', email: 'expert@exemple.dz' };
    const decision = resolveAdminAccess({ sessionUser, profile: fixtureProfile('EXPERT', 'expert-001') });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('ROLE_EXPERT_DENIED');
  });

  it('TEST 4 — ADMIN authentifié cohérent -> accès autorisé', () => {
    const sessionUser = { id: 'admin-001', email: 'admin@exemple.dz' };
    const decision = resolveAdminAccess({ sessionUser, profile: fixtureProfile('ADMIN', 'admin-001') });
    expect(decision.allowed).toBe(true);
    expect(decision.isAuthenticated).toBe(true);
    expect(decision.reason).toBe('ADMIN_OK');
  });

  it('TEST 5 — logout (session supprimée) -> accès refusé', () => {
    // Après supabase.auth.signOut(), la session devient nulle.
    const afterLogout = resolveAdminAccess({ sessionUser: null, profile: fixtureProfile('ADMIN', 'admin-001') });
    expect(afterLogout.allowed).toBe(false);
    expect(afterLogout.reason).toBe('NO_SESSION');
  });

  it('TEST 6 — session expirée / profil manquant / incohérence -> accès refusé', () => {
    const sessionUser = { id: 'admin-001', email: 'admin@exemple.dz' };
    expect(resolveAdminAccess({ sessionUser, profile: null }).allowed).toBe(false);
    expect(resolveAdminAccess({ sessionUser, profile: null }).reason).toBe('NO_PROFILE');
    // Sécurité : le profile doit appartenir à l'utilisateur de la session.
    const mismatch = resolveAdminAccess({ sessionUser, profile: fixtureProfile('ADMIN', 'autre-id') });
    expect(mismatch.allowed).toBe(false);
    expect(mismatch.reason).toBe('USER_MISMATCH_DENIED');
  });

  it("TEST 7 — aucun bypass loginAsAdmin : l'email vient de Supabase Auth, pas du profil", () => {
    const sessionUser = { id: 'admin-001', email: 'vrai-admin@exemple.dz' };
    const profile = { ...fixtureProfile('ADMIN', 'admin-001'), full_name: 'Faux Nom Profil' };
    // Même si full_name ressemble à un email, il est ignoré.
    expect(resolveAdminEmail(sessionUser, profile)).toBe('vrai-admin@exemple.dz');
    expect(resolveAdminEmail(null, profile)).toBeNull();
  });
});

describe('P1 — Supabase client strict : aucune clé fictive', () => {
  const ENV_KEYS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('throw SUPABASE_CONFIGURATION_REQUIRED si URL / clé absentes', () => {
    expect(() => resolveSupabaseUrl()).toThrow('SUPABASE_CONFIGURATION_REQUIRED');
    expect(() => resolveSupabaseAnonKey()).toThrow('SUPABASE_CONFIGURATION_REQUIRED');
    expect(isSupabaseConfigured()).toBe(false);
    expect(SUPABASE_CONFIGURATION_REQUIRED).toContain('SUPABASE_CONFIGURATION_REQUIRED');
  });

  it('résout URL + clé publishable (nouveau format sb_publishable_)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemple.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
    expect(resolveSupabaseUrl()).toBe('https://exemple.supabase.co');
    expect(resolveSupabaseAnonKey()).toBe('sb_publishable_fixture');
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('ne contient plus mock-anon-key / mock-service-role-key', () => {
    const clientPath = path.resolve(process.cwd(), 'packages/database/src/client.ts');
    const source = fs.readFileSync(clientPath, 'utf8');
    expect(source).not.toContain('mock-anon-key');
    expect(source).not.toContain('mock-service-role-key');
  });
});

describe('P1 — Garde-fou statique : aucun bypass Admin résiduel', () => {
  const guardPath = path.resolve(process.cwd(), 'apps/web-admin/src/components/AdminGuard.tsx');
  const layoutPath = path.resolve(process.cwd(), 'apps/web-admin/src/components/ClientLayout.tsx');

  it("supprime loginAsAdmin / dev@ / Admin (dev) / bypass NODE_ENV", () => {
    const guard = fs.readFileSync(guardPath, 'utf8');
    expect(guard).not.toContain('loginAsAdmin');
    expect(guard).not.toContain('dev@echrimheni.dz');
    expect(guard).not.toContain('Admin (dev)');
    expect(guard).not.toContain("NODE_ENV === 'development'");
    expect(guard).not.toContain('NODE_ENV==="development"');
    // Logout réel exigé.
    expect(guard).toContain('signOutUser');
    expect(guard).toContain('onAuthStateChange');
  });

  it('ClientLayout applique authenticated + ADMIN avant de rendre le contenu', () => {
    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).toContain('useAdminAuth');
    expect(layout).toContain('isAuthenticated');
    expect(layout).toContain('isAdmin');
    expect(layout).toContain('/login');
  });
});
