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

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignUpResult {
  success: boolean;
  needsEmailConfirmation: boolean;
  error?: string | null;
  errorKind?: BuyerAuthErrorKind | null;
}

export interface BuyerAuthState {
  sessionUserId: string | null;
  sessionEmail: string | null;
  profile: Profile | null;
  role: Profile['role'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  errorKind: BuyerAuthErrorKind | null;
  info: string | null;
  clearError: () => void;
  setInfo: (msg: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUpBuyer: (email: string, password: string, fullName: string, phone: string) => Promise<SignUpResult>;
  signUpExpert: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    wilaya: string,
    commune: string
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function formatAuthErrorMessage(rawMessage: string): { messageKey: string; kind: BuyerAuthErrorKind } {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('network error') ||
    lower.includes('networkerror') ||
    lower.includes('timeout')
  ) {
    return { messageKey: 'errors.network', kind: 'NETWORK' };
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return { messageKey: 'auth.rateLimitExceeded', kind: 'AUTH' };
  }
  if (
    lower.includes('already registered') ||
    lower.includes('already in use') ||
    lower.includes('already exists') ||
    lower.includes('email_exists') ||
    lower.includes('user already registered')
  ) {
    return { messageKey: 'auth.emailAlreadyUsed', kind: 'VALIDATION' };
  }
  if (
    lower.includes('password should be at least 6 characters') ||
    lower.includes('password too short') ||
    lower.includes('at least 6 characters')
  ) {
    return { messageKey: 'auth.passwordTooShort', kind: 'VALIDATION' };
  }
  if (
    lower.includes('email not confirmed') ||
    lower.includes('email_not_confirmed')
  ) {
    return { messageKey: 'auth.emailNotConfirmed', kind: 'AUTH' };
  }
  if (
    lower.includes('invalid email') ||
    lower.includes('format email') ||
    lower.includes('email address')
  ) {
    return { messageKey: 'auth.invalidEmail', kind: 'VALIDATION' };
  }
  if (
    lower.includes('invalid') ||
    lower.includes('faible') ||
    lower.includes('faibles') ||
    lower.includes('requis') ||
    lower.includes('required')
  ) {
    return { messageKey: rawMessage, kind: 'VALIDATION' };
  }
  return { messageKey: rawMessage, kind: 'AUTH' };
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
  info: null,
  clearError: () => {},
  setInfo: () => {},
  signIn: async () => {},
  signUpBuyer: async () => ({ success: false, needsEmailConfirmation: false }),
  signUpExpert: async () => ({ success: false, needsEmailConfirmation: false }),
  signOut: async () => {},
  refresh: async () => {},
});

export function BuyerAuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<BuyerAuthErrorKind | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setErrorKind(null);
  }, []);

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
      const rawMessage = err instanceof Error ? err.message : 'Erreur de session.';
      const formatted = formatAuthErrorMessage(rawMessage);
      setError(formatted.messageKey);
      setErrorKind(formatted.kind);
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
      setInfo(null);
      const cleanEmail = email.trim();
      if (!cleanEmail || !password) {
        setError('auth.emailPasswordRequired');
        setErrorKind('VALIDATION');
        return;
      }
      try {
        await signInUser(cleanEmail, password);
        await refresh();
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : 'Échec de la connexion.';
        const formatted = formatAuthErrorMessage(rawMessage);
        setError(formatted.messageKey);
        setErrorKind(formatted.kind);
      }
    },
    [refresh]
  );

  const signUpBuyer = useCallback(
    async (email: string, password: string, fullName: string, phone: string): Promise<SignUpResult> => {
      setError(null);
      setErrorKind(null);
      setInfo(null);

      const cleanEmail = email.trim();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      if (!cleanEmail || !password || !cleanName || !cleanPhone) {
        const msg = 'auth.allFieldsRequired';
        setError(msg);
        setErrorKind('VALIDATION');
        return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
      }

      if (!EMAIL_REGEX.test(cleanEmail)) {
        const msg = 'auth.invalidEmail';
        setError(msg);
        setErrorKind('VALIDATION');
        return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
      }

      if (password.length < 6) {
        const msg = 'auth.passwordTooShort';
        setError(msg);
        setErrorKind('VALIDATION');
        return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
      }

      try {
        const data = await signUpUser({
          email: cleanEmail,
          password,
          role: 'BUYER',
          fullName: cleanName,
          phone: cleanPhone,
        });

        // Supabase anti-enumeration check: existing user returns user with empty identities
        if (data?.user && Array.isArray((data.user as { identities?: unknown[] }).identities) && (data.user as { identities: unknown[] }).identities.length === 0) {
          const msg = 'auth.emailAlreadyUsed';
          setError(msg);
          setErrorKind('VALIDATION');
          return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
        }

        if (data?.session) {
          await refresh();
          return { success: true, needsEmailConfirmation: false };
        }

        setInfo('auth.checkEmailConfirmation');
        return { success: true, needsEmailConfirmation: true };
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : "Échec de l'inscription.";
        const formatted = formatAuthErrorMessage(rawMessage);
        setError(formatted.messageKey);
        setErrorKind(formatted.kind);
        return {
          success: false,
          needsEmailConfirmation: false,
          error: formatted.messageKey,
          errorKind: formatted.kind,
        };
      }
    },
    [refresh]
  );

  const signUpExpert = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone: string,
      wilaya: string,
      commune: string
    ): Promise<SignUpResult> => {
      setError(null);
      setErrorKind(null);
      setInfo(null);

      const cleanEmail = email.trim();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();
      const cleanWilaya = wilaya.trim();
      const cleanCommune = commune.trim();

      if (!cleanEmail || !password || !cleanName || !cleanPhone || !cleanWilaya) {
        const msg = 'auth.expertFieldsRequired';
        setError(msg);
        setErrorKind('VALIDATION');
        return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
      }

      if (!EMAIL_REGEX.test(cleanEmail)) {
        const msg = 'auth.invalidEmail';
        setError(msg);
        setErrorKind('VALIDATION');
        return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
      }

      if (password.length < 6) {
        const msg = 'auth.passwordTooShort';
        setError(msg);
        setErrorKind('VALIDATION');
        return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
      }

      try {
        const data = await signUpUser({
          email: cleanEmail,
          password,
          role: 'EXPERT',
          fullName: cleanName,
          phone: cleanPhone,
          wilaya: cleanWilaya,
          commune: cleanCommune || 'Alger-Centre',
        });

        if (data?.user && Array.isArray((data.user as { identities?: unknown[] }).identities) && (data.user as { identities: unknown[] }).identities.length === 0) {
          const msg = 'auth.emailAlreadyUsed';
          setError(msg);
          setErrorKind('VALIDATION');
          return { success: false, needsEmailConfirmation: false, error: msg, errorKind: 'VALIDATION' };
        }

        if (data?.session) {
          await refresh();
          return { success: true, needsEmailConfirmation: false };
        }

        setInfo('auth.checkEmailConfirmation');
        return { success: true, needsEmailConfirmation: true };
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : "Échec de l'inscription expert.";
        const formatted = formatAuthErrorMessage(rawMessage);
        setError(formatted.messageKey);
        setErrorKind(formatted.kind);
        return {
          success: false,
          needsEmailConfirmation: false,
          error: formatted.messageKey,
          errorKind: formatted.kind,
        };
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
      setInfo(null);
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
        info,
        clearError,
        setInfo,
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
