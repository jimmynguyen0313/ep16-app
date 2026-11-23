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

export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
}
