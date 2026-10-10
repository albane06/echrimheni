import { getSupabaseClient } from '../client.js';
import { Profile, UserRole } from '@echrimheni/shared';

export async function signUpUser(params: {
  email: string;
  password: string;
  role: 'BUYER' | 'EXPERT';
  fullName: string;
  phone: string;
  wilaya?: string;
  commune?: string;
}) {
  const supabase = getSupabaseClient();
  
  // Strict check: clients can NEVER request role = 'ADMIN'
  const safeRole = params.role === 'EXPERT' ? 'EXPERT' : 'BUYER';

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        role: safeRole,
        full_name: params.fullName,
        phone: params.phone,
        wilaya: params.wilaya || 'Alger',
        commune: params.commune || 'Alger-Centre'
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function signInUser(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export interface SupabaseSessionUser {
  id: string;
  email?: string | null;
}

export interface AdminAccessInput {
  sessionUser: SupabaseSessionUser | null;
  profile: Profile | null;
}

export interface AdminAccessDecision {
  allowed: boolean;
  isAuthenticated: boolean;
  reason:
    | 'ADMIN_OK'
    | 'NO_SESSION'
    | 'NO_PROFILE'
    | 'ROLE_BUYER_DENIED'
    | 'ROLE_EXPERT_DENIED'
    | 'ROLE_UNKNOWN_DENIED'
    | 'USER_MISMATCH_DENIED';
}

/**
 * P1 — Logique pure d'autorisation Admin (testable sans Supabase live).
 * Seul un couple cohérent (session + profile ADMIN sur le même id) est autorisé.
 */
export function resolveAdminAccess(input: AdminAccessInput): AdminAccessDecision {
  const { sessionUser, profile } = input;
  if (!sessionUser) {
    return { allowed: false, isAuthenticated: false, reason: 'NO_SESSION' };
  }
  if (!profile) {
    return { allowed: false, isAuthenticated: true, reason: 'NO_PROFILE' };
  }
  if (profile.id !== sessionUser.id) {
    return { allowed: false, isAuthenticated: true, reason: 'USER_MISMATCH_DENIED' };
  }
  if (profile.role === 'ADMIN') {
    return { allowed: true, isAuthenticated: true, reason: 'ADMIN_OK' };
  }
  if (profile.role === 'BUYER') {
    return { allowed: false, isAuthenticated: true, reason: 'ROLE_BUYER_DENIED' };
  }
  if (profile.role === 'EXPERT') {
    return { allowed: false, isAuthenticated: true, reason: 'ROLE_EXPERT_DENIED' };
  }
  return { allowed: false, isAuthenticated: true, reason: 'ROLE_UNKNOWN_DENIED' };
}

/**
 * P1 — Email réel : toujours issu de Supabase Auth, jamais de profile.full_name.
 * Retourne null si aucune session (aucun fallback fictif).
 */
export function resolveAdminEmail(
  sessionUser: SupabaseSessionUser | null,
  _profile?: Profile | null
): string | null {
  return sessionUser?.email ?? null;
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUserWithProfile(): Promise<{
  sessionUser: SupabaseSessionUser | null;
  profile: Profile | null;
}> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { sessionUser: null, profile: null };
  const sessionUser: SupabaseSessionUser = { id: session.user.id, email: session.user.email ?? null };
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) return { sessionUser, profile: null };
  return { sessionUser, profile: data as Profile };
}

export function onAuthStateChange(callback: (sessionUser: SupabaseSessionUser | null) => void) {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      callback(null);
    } else {
      callback({ id: session.user.id, email: session.user.email ?? null });
    }
  });
  return data.subscription;
}