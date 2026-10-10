import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getCurrentUserWithProfile,
  onAuthStateChange,
  signInUser,
  signOutUser,
  signUpUser,
} from '@echrimheni/database';
import type { Profile } from '@echrimheni/shared';

export type BuyerAuthErrorKind = 'AUTH' | 'VALIDATION' | 'NETWORK' | 'UNKNOWN';

export interface BuyerAuthState {
  sessionUserId: string | null;
  sessionEmail: string | null;
  profile: Profile | null;
  role: Profile['role'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  errorKind: BuyerAuthErrorKind | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpBuyer: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  signUpExpert: (email: string, password: string, fullName: string, phone: string, wilaya: string, commune: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const BuyerAuthContext = createContext<BuyerAuthState>({
  sessionUserId: null,
  sessionEmail: null,
  profile: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  errorKind: null,
  signIn: async () => {},
  signUpBuyer: async () => {},
  signUpExpert: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

function kindOf(message: string): BuyerAuthErrorKind {
  const lower = message.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('timeout') ||
    lower.includes('networkerror')
  ) {
    return 'NETWORK';
  }
  if (
    lower.includes('invalid') ||
    lower.includes('faible') ||
    lower.includes('faibles') ||
    lower.includes('requis') ||
    lower.includes('required') ||
    lower.includes('faible')
  ) {
    return 'VALIDATION';
  }
  return 'AUTH';
}

export function BuyerAuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<BuyerAuthErrorKind | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { sessionUser, profile: current } = await getCurrentUserWithProfile();
      setSessionUserId(sessionUser?.id ?? null);
      setSessionEmail(sessionUser?.email ?? null);
      setProfile(current);
      setError(null);
      setErrorKind(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de session.';
      setError(message);
      setErrorKind(kindOf(message));
      setSessionUserId(null);
      setSessionEmail(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      // Session persistée par le client Supabase (clé publishable uniquement).
      subscription = onAuthStateChange(() => {
        void refresh();
      });
    } catch {
      // Client non configuré : refresh() a déjà positionné l'erreur explicite.
    }
    return () => {
      subscription?.unsubscribe();
    };
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setErrorKind(null);
      const cleanEmail = email.trim();
      if (!cleanEmail || !password) {
        setError('Email et mot de passe requis.');
        setErrorKind('VALIDATION');
        return;
      }
      try {
        await signInUser(cleanEmail, password);
        await refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Échec de la connexion.';
        setError(message);
        setErrorKind(kindOf(message));
      }
    },
    [refresh]
  );

  const signUpBuyer = useCallback(
    async (email: string, password: string, fullName: string, phone: string) => {
      setError(null);
      setErrorKind(null);
      const cleanEmail = email.trim();
      if (!cleanEmail || !password || !fullName.trim() || !phone.trim()) {
        setError('Tous les champs sont requis.');
        setErrorKind('VALIDATION');
        return;
      }
      try {
        // Rôle forcé BUYER côté service (jamais d'ADMIN depuis le client).
        await signUpUser({
          email: cleanEmail,
          password,
          role: 'BUYER',
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
        await refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Échec de l'inscription.";
        setError(message);
        setErrorKind(kindOf(message));
      }
    },
    [refresh]
  );

  const signUpExpert = useCallback(
    async (email: string, password: string, fullName: string, phone: string, wilaya: string, commune: string) => {
      setError(null);
      setErrorKind(null);
      const cleanEmail = email.trim();
      if (!cleanEmail || !password || !fullName.trim() || !phone.trim() || !wilaya.trim()) {
        setError('Email, mot de passe, nom, téléphone et wilaya sont requis.');
        setErrorKind('VALIDATION');
        return;
      }
      try {
        // Rôle EXPERT demandé ; le trigger serveur crée profiles + expert_profiles.
        // ADMIN impossible depuis le client (garde serveur + trigger).
        await signUpUser({
          email: cleanEmail,
          password,
          role: 'EXPERT',
          fullName: fullName.trim(),
          phone: phone.trim(),
          wilaya: wilaya.trim(),
          commune: commune.trim() || 'Alger-Centre',
        });
        await refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Échec de l'inscription expert.";
        setError(message);
        setErrorKind(kindOf(message));
      }
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
    } finally {
      setSessionUserId(null);
      setSessionEmail(null);
      setProfile(null);
      setError(null);
      setErrorKind(null);
    }
  }, []);

  return (
    <BuyerAuthContext.Provider
      value={{
        sessionUserId,
        sessionEmail,
        profile,
        role: profile?.role ?? null,
        isAuthenticated: sessionUserId !== null,
        isLoading,
        error,
        errorKind,
        signIn,
        signUpBuyer,
        signUpExpert,
        signOut,
        refresh,
      }}
    >
      {children}
    </BuyerAuthContext.Provider>
  );
}

export const useBuyerAuth = () => useContext(BuyerAuthContext);
