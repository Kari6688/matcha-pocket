import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

const GUEST_KEY = 'matcha-guest-v1';

interface AuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  isGuest: boolean;
  /** Signed in or browsing as guest — can enter the app */
  canEnterApp: boolean;
  user: User | null;
  userId: string | null;
  email: string | null;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadGuestFlag() {
  try {
    return localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(loadGuestFlag);
  const [isLoaded, setIsLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) {
        try {
          localStorage.removeItem(GUEST_KEY);
        } catch {
          /* ignore */
        }
        setIsGuest(false);
      }
      setIsLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        try {
          localStorage.removeItem(GUEST_KEY);
        } catch {
          /* ignore */
        }
        setIsGuest(false);
      }
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        ...(provider === 'google'
          ? {
              queryParams: {
                access_type: 'offline',
                prompt: 'select_account',
              },
            }
          : {}),
      },
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(() => signInWithOAuth('google'), [signInWithOAuth]);
  const signInWithApple = useCallback(() => signInWithOAuth('apple'), [signInWithOAuth]);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    const trimmed = email.trim();
    if (!trimmed) throw new Error('Enter your email');
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  }, []);

  const continueAsGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
    setIsGuest(false);
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const isSignedIn = Boolean(user);
    return {
      isLoaded,
      isSignedIn,
      isGuest: isGuest && !isSignedIn,
      canEnterApp: isSignedIn || isGuest,
      user,
      userId: user?.id ?? null,
      email: user?.email ?? user?.user_metadata?.email ?? null,
      configured: isSupabaseConfigured,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      continueAsGuest,
      signOut,
    };
  }, [
    session,
    isLoaded,
    isGuest,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    continueAsGuest,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
