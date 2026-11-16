'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient, SUPABASE_CONFIGURATION_REQUIRED } from '@echrimheni/database/client';
import {
  getCurrentUserWithProfile,
  resolveAdminAccess,
  resolveAdminEmail,
  signOutUser
} from '@echrimheni/database/services/auth';
import { shareInFlight, withTimeout, VERIFY_TIMEOUT_MS } from '@echrimheni/database';

interface AdminAuthContextType {
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminEmail: string | null;
  adminName: string | null;
  adminId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  isAuthenticated: false,
  isLoading: true,
  adminEmail: null,
  adminName: null,
  adminId: null,
  error: null,
  refresh: async () => {},
  logout: async () => {}
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyDecision = useCallback(
    (
      sessionUser: { id: string; email?: string | null } | null,
      profile: { id: string; role: string; full_name: string } | null
    ) => {
      const decision = resolveAdminAccess({
        sessionUser,
        profile: profile as unknown as import('@echrimheni/shared').Profile | null
      });
      setIsAuthenticated(decision.isAuthenticated);
      setIsAdmin(decision.allowed);
      if (decision.allowed && sessionUser && profile) {
        setAdminId(sessionUser.id);
        // Email réel issu de Supabase Auth uniquement — aucun fallback fictif.
        setAdminEmail(resolveAdminEmail(sessionUser, profile as never));
        setAdminName(profile.full_name);
        setError(null);
      } else {
        setAdminId(null);
        setAdminEmail(sessionUser?.email ?? null);
        setAdminName(profile?.full_name ?? null);
        if (!decision.isAuthenticated) {
          setError(null);
        } else if (!decision.allowed) {
          setError('Accès réservé aux administrateurs.');
        }
      }
    },
    []
  );

  const checkAdminAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // P67-FIX — Timeout explicite : une vérification distante ne doit jamais
      // laisser un loading infini. En cas de timeout, erreur affichée, session
      // locale préservée (aucune déconnexion forcée).
      const { sessionUser, profile } = await withTimeout(
        getCurrentUserWithProfile(),
        VERIFY_TIMEOUT_MS,
        'Impossible de joindre Supabase. Vérifiez votre connexion puis réessayez.'
      );
      applyDecision(sessionUser, profile as never);
      if (!sessionUser) {
        setError(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur d’authentification.';
      if (message.includes('SUPABASE_CONFIGURATION_REQUIRED')) {
        setError(SUPABASE_CONFIGURATION_REQUIRED);
      } else {
        setError(message);
      }
      setIsAdmin(false);
      setIsAuthenticated(false);
      setAdminEmail(null);
      setAdminName(null);
      setAdminId(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyDecision]);

  // P67-FIX — Déduplication : les appels concurrents (StrictMode, événement
  // INITIAL_SESSION) partagent la même Promise en vol au lieu de lancer
  // plusieurs vérifications (et plusieurs requêtes profiles) en parallèle.
  // checkAdminAuth est stable ([applyDecision] stable) : le partage est créé une fois.
  const checkAdminAuthShared = useMemo(() => shareInFlight(() => checkAdminAuth()), [checkAdminAuth]);

  useEffect(() => {
    void checkAdminAuthShared();
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const client = getSupabaseClient();
      const { data } = client.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          setIsAdmin(false);
          setIsAuthenticated(false);
          setAdminEmail(null);
          setAdminName(null);
          setAdminId(null);
          setIsLoading(false);
          return;
        }
        await checkAdminAuthShared();
      });
      subscription = data.subscription;
    } catch {
      // Configuration manquante : checkAdminAuth a déjà positionné l'erreur explicite.
    }
    return () => {
      subscription?.unsubscribe();
    };
  }, [checkAdminAuthShared]);

  const logout = useCallback(async () => {
    // Logout réel Supabase — supprime la session serveur + locale.
    await signOutUser();
    setIsAdmin(false);
    setIsAuthenticated(false);
    setAdminEmail(null);
    setAdminName(null);
    setAdminId(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ isAdmin, isAuthenticated, isLoading, adminEmail, adminName, adminId, error, refresh: checkAdminAuthShared, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
