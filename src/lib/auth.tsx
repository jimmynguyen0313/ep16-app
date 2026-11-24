import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { hasSupabase, supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  /** False until the saved session (if any) has been read from storage. */
  ready: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!hasSupabase());

  useEffect(() => {
    if (!hasSupabase()) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Drop the previous person's cached diary whenever who's signed in changes.
      if (!next) queryClient.removeQueries({ queryKey: ['diary'] });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const value: AuthState = {
    session,
    ready,
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    deleteAccount: async () => {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      // The account no longer exists on the server, so only clear this device's session.
      await supabase.auth.signOut({ scope: 'local' });
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const MIN_PASSWORD = 8;

/**
 * Create an account with email and password. With "Confirm email" off in Supabase this
 * signs the person straight in; with it on, Supabase emails a link first (needsConfirmation).
 */
export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  return { needsConfirmation: !data.session };
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Email a password-reset code. Supabase's "Reset password" email template must include
 * {{ .Token }} (see the README), because the app takes the code rather than a link.
 */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/** Check the emailed code, which signs the person in, then set their new password. */
export async function resetPassword(email: string, code: string, password: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) throw error;
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) throw updateError;
}
