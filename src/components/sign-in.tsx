import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { sendCode, verifyCode } from '@/lib/auth';
import { hasSupabase } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Passwordless sign-in: enter email, then the code Supabase emails you. New emails create an account. */
export function SignIn({ title = 'Sign in to keep your diary', subtitle }: { title?: string; subtitle?: string }) {
  const c = useColors();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!hasSupabase()) {
    return (
      <View style={styles.wrap}>
        <T v="heading">Accounts aren’t set up</T>
        <T muted>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env.local and restart the dev server.</T>
      </View>
    );
  }

  const send = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) return setError('Enter a valid email address.');
    setBusy(true);
    setError('');
    try {
      await sendCode(value);
      setEmail(value);
      setStep('code');
      setCooldown(60);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const value = code.replace(/\D/g, '');
    if (value.length < 6) return setError('Enter the code from the email.');
    setBusy(true);
    setError('');
    try {
      await verifyCode(email, value);
      // Success: the auth listener updates the session and the screen re-renders signed in.
    } catch (e) {
      setError(friendly(e));
      setBusy(false);
    }
  };

  const input = [
    styles.input,
    { color: c.ink, backgroundColor: c.surface, borderColor: c.line, fontFamily: Fonts.sans },
  ];

  return (
    <View style={styles.wrap}>
      <T v="title">{title}</T>
      {step === 'email' ? (
        <>
          <T muted>
            {subtitle ??
              'Enter your email and we’ll send you a sign-in code. No password needed, and a new email creates your account.'}
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
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={send}
            accessibilityLabel="Email address"
            style={input}
          />
          <Button label="Send code" onPress={send} busy={busy} />
        </>
      ) : (
        <>
          <T muted>
            We sent a code to <T style={{ fontFamily: Fonts.serifBold }}>{email}</T>. It expires in an hour.
          </T>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
            placeholder="123456"
            placeholderTextColor={c.muted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={verify}
            accessibilityLabel="Sign-in code"
            style={[input, styles.code]}
            autoFocus
          />
          <Button label="Sign in" onPress={verify} busy={busy} />
          <View style={styles.links}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStep('email');
                setCode('');
                setError('');
              }}>
              <T v="small" style={{ color: c.jade }}>
                Use a different email
              </T>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={cooldown > 0 || busy} onPress={send}>
              <T v="small" style={{ color: cooldown ? c.muted : c.jade }}>
                {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
              </T>
            </Pressable>
          </View>
        </>
      )}
      {error ? (
        <T v="small" style={{ color: c.danger }} accessibilityRole="alert">
          {error}
        </T>
      ) : null}
    </View>
  );
}

function Button({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: c.accent, opacity: pressed || busy ? 0.7 : 1 }]}>
      {busy ? (
        <ActivityIndicator color={c.onAccent} />
      ) : (
        <Text style={{ color: c.onAccent, fontFamily: Fonts.sans, fontSize: 16 }}>{label}</Text>
      )}
    </Pressable>
  );
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/expired|invalid/i.test(msg)) return 'That code didn’t work. Check it, or send a new one.';
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Too many attempts. Wait a minute, then try again.';
  if (/network|fetch/i.test(msg)) return 'Couldn’t reach the server. Check your connection.';
  return msg;
}

const styles = StyleSheet.create({
  wrap: { gap: Space.md, width: '100%', maxWidth: 440, alignSelf: 'center' },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 12, fontSize: 17 },
  code: { fontSize: 26, letterSpacing: 6, textAlign: 'center' },
  button: {
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
});
