import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { MIN_PASSWORD, resetPassword, sendPasswordReset, signInWithPassword, signUpWithPassword } from '@/lib/auth';
import { hasSupabase } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^\d{6,10}$/;

type Mode = 'signin' | 'signup' | 'reset';

/** Email and password sign-in, with switches to create an account or reset a forgotten password. */
export function SignIn({ title = 'Sign in to keep your diary', subtitle }: { title?: string; subtitle?: string }) {
  const c = useColors();
  const [mode, setMode] = useState<Mode>('signin');
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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

  const go = (next: Mode) => {
    setMode(next);
    setCodeSent(false);
    setPassword('');
    setCode('');
    setError('');
    setNotice('');
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) return setError('Enter a valid email address.');

    if (mode === 'reset' && !codeSent) {
      return run(async () => {
        await sendPasswordReset(e);
        setCodeSent(true);
        setNotice(`If ${e} has an Ep.16 account, a reset code is on its way. Check your inbox and spam folder.`);
      });
    }
    if (mode === 'reset' && !CODE.test(code.trim())) return setError('Enter the code from the email.');
    if (mode !== 'signin' && password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    if (!password) return setError('Enter your password.');

    // On success the auth listener updates the session and the screen re-renders signed in.
    return run(async () => {
      if (mode === 'reset') {
        await resetPassword(e, code.trim(), password);
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUpWithPassword(e, password);
        if (needsConfirmation) {
          go('signin');
          setNotice('Check your email to confirm your account, then sign in.');
        }
      } else {
        await signInWithPassword(e, password);
      }
    });
  };

  const field = (props: TextInputProps) => (
    <TextInput
      placeholderTextColor={c.muted}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.input, { color: c.ink, backgroundColor: c.surface, borderColor: c.line, fontFamily: Fonts.sans }]}
    />
  );

  const heading = mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : title;
  const blurb =
    mode === 'signup'
      ? 'Your diary syncs to your account, so it’s on every device you sign in on.'
      : mode === 'reset'
        ? codeSent
          ? 'Enter the code from the email and choose a new password.'
          : 'We’ll email you a code to set a new password.'
        : (subtitle ?? 'Sign in with your email and password.');
  const action =
    mode === 'signup'
      ? 'Create account'
      : mode === 'reset'
        ? codeSent
          ? 'Set new password'
          : 'Email me a code'
        : 'Sign in';
  const askPassword = mode !== 'reset' || codeSent;

  return (
    <View style={styles.wrap}>
      <T v="title">{heading}</T>
      <T muted>{blurb}</T>
      {field({
        value: email,
        onChangeText: setEmail,
        placeholder: 'you@example.com',
        keyboardType: 'email-address',
        autoComplete: 'email',
        textContentType: mode === 'signin' ? 'emailAddress' : 'username',
        editable: !(mode === 'reset' && codeSent),
        returnKeyType: askPassword ? 'next' : 'send',
        onSubmitEditing: askPassword ? undefined : submit,
        accessibilityLabel: 'Email address',
      })}
      {mode === 'reset' && codeSent
        ? field({
            value: code,
            onChangeText: (t) => setCode(t.replace(/\D/g, '')),
            placeholder: 'Code from the email',
            keyboardType: 'number-pad',
            autoComplete: 'one-time-code',
            textContentType: 'oneTimeCode',
            maxLength: 10,
            accessibilityLabel: 'Reset code',
          })
        : null}
      {askPassword
        ? field({
            value: password,
            onChangeText: setPassword,
            placeholder: mode === 'signin' ? 'Password' : `New password (at least ${MIN_PASSWORD} characters)`,
            secureTextEntry: true,
            autoComplete: mode === 'signin' ? 'current-password' : 'new-password',
            textContentType: mode === 'signin' ? 'password' : 'newPassword',
            passwordRules: mode === 'signin' ? undefined : `minlength: ${MIN_PASSWORD};`,
            returnKeyType: 'go',
            onSubmitEditing: submit,
            accessibilityLabel: mode === 'signin' ? 'Password' : 'New password',
          })
        : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={submit}
        style={({ pressed }) => [styles.button, { backgroundColor: c.accent, opacity: pressed || busy ? 0.7 : 1 }]}>
        {busy ? (
          <ActivityIndicator color={c.onAccent} />
        ) : (
          <Text style={{ color: c.onAccent, fontFamily: Fonts.sans, fontSize: 16 }}>{action}</Text>
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

      <View style={styles.links}>
        {mode === 'signin' ? (
          <>
            <Link label="Forgot password?" onPress={() => go('reset')} />
            <Link prefix="New to Ep.16? " label="Create an account" onPress={() => go('signup')} />
          </>
        ) : mode === 'signup' ? (
          <Link prefix="Already have an account? " label="Sign in" onPress={() => go('signin')} />
        ) : (
          <>
            {codeSent ? <Link label="Send a new code" onPress={() => setCodeSent(false)} /> : null}
            <Link label="Back to sign in" onPress={() => go('signin')} />
          </>
        )}
      </View>
    </View>
  );
}

function Link({ prefix, label, onPress }: { prefix?: string; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={{ paddingVertical: Space.xs }}>
      <T v="small" muted>
        {prefix}
        <T v="small" style={{ color: c.jade }}>
          {label}
        </T>
      </T>
    </Pressable>
  );
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match. Check them and try again.';
  if (/already registered|already exists/i.test(msg))
    return 'An account with this email already exists. Sign in instead.';
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link from Supabase.';
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg))
    return 'That code is wrong or has expired. Check it, or send a new one.';
  if (/should be different|same password/i.test(msg)) return 'Choose a password you haven’t used for Ep.16 before.';
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
  links: { alignItems: 'center', gap: Space.xs, paddingTop: Space.xs },
});
