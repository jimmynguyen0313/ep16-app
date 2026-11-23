import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { MIN_PASSWORD, signInWithPassword, signUpWithPassword } from '@/lib/auth';
import { hasSupabase } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email and password sign-in, with a switch to create an account. */
export function SignIn({ title = 'Sign in to keep your diary', subtitle }: { title?: string; subtitle?: string }) {
  const c = useColors();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!hasSupabase()) {
    return (
      <View style={styles.wrap}>
        <T v="heading">Accounts aren’t set up</T>
        <T muted>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env.local and restart the dev server.</T>
      </View>
    );
  }

  const signup = mode === 'signup';

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) return setError('Enter a valid email address.');
    if (signup && password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (signup) {
        const { needsConfirmation } = await signUpWithPassword(e, password);
        if (needsConfirmation) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      } else {
        await signInWithPassword(e, password);
      }
      // On success the auth listener updates the session and the screen re-renders signed in.
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(signup ? 'signin' : 'signup');
    setError('');
    setNotice('');
  };

  const input = [
    styles.input,
    { color: c.ink, backgroundColor: c.surface, borderColor: c.line, fontFamily: Fonts.sans },
  ];

  return (
    <View style={styles.wrap}>
      <T v="title">{signup ? 'Create your account' : title}</T>
      <T muted>
        {signup
          ? 'Your diary syncs to your account, so it’s on every device you sign in on.'
          : (subtitle ?? 'Sign in with your email and password.')}
      </T>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={c.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType={signup ? 'username' : 'emailAddress'}
        returnKeyType="next"
        accessibilityLabel="Email address"
        style={input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={signup ? `Password (at least ${MIN_PASSWORD} characters)` : 'Password'}
        placeholderTextColor={c.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={signup ? 'new-password' : 'current-password'}
        textContentType={signup ? 'newPassword' : 'password'}
        passwordRules={signup ? `minlength: ${MIN_PASSWORD};` : undefined}
        returnKeyType="go"
        onSubmitEditing={submit}
        accessibilityLabel="Password"
        style={input}
      />
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={submit}
        style={({ pressed }) => [styles.button, { backgroundColor: c.accent, opacity: pressed || busy ? 0.7 : 1 }]}>
        {busy ? (
          <ActivityIndicator color={c.onAccent} />
        ) : (
          <Text style={{ color: c.onAccent, fontFamily: Fonts.sans, fontSize: 16 }}>
            {signup ? 'Create account' : 'Sign in'}
          </Text>
        )}
      </Pressable>

      {error ? (
        <T v="small" style={{ color: c.danger }} accessibilityRole="alert">
          {error}
        </T>
      ) : null}
      {notice ? (
        <T v="small" style={{ color: c.jade }} accessibilityRole="alert">
          {notice}
        </T>
      ) : null}

      <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switch}>
        <T v="small" muted>
          {signup ? 'Already have an account? ' : 'New to Ep.16? '}
          <T v="small" style={{ color: c.jade }}>
            {signup ? 'Sign in' : 'Create an account'}
          </T>
        </T>
      </Pressable>
    </View>
  );
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match. Check them and try again.';
  if (/already registered|already exists/i.test(msg))
    return 'An account with this email already exists. Sign in instead.';
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link from Supabase.';
  if (/password should be|weak password/i.test(msg))
    return `Choose a stronger password (at least ${MIN_PASSWORD} characters).`;
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Too many attempts. Wait a minute, then try again.';
  if (/network|fetch/i.test(msg)) return 'Couldn’t reach the server. Check your connection.';
  return msg;
}

const styles = StyleSheet.create({
  wrap: { gap: Space.md, width: '100%', maxWidth: 440, alignSelf: 'center' },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 12, fontSize: 17 },
  button: {
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  switch: { alignItems: 'center', paddingVertical: Space.sm },
});
