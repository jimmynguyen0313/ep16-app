import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignIn } from '@/components/sign-in';
import { T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AccountScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { session, ready } = useAuth();

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.wrap,
        { paddingTop: insets.top + Space.xl, paddingBottom: insets.bottom + Space.xxl },
      ]}>
      <T v="display">Ep.16</T>
      <T muted>A diary for every K-drama you’ve watched, rated, and loved (or didn’t).</T>

      {!ready ? (
        <ActivityIndicator color={c.jade} />
      ) : session ? (
        <SignedIn email={session.user.email ?? 'your account'} />
      ) : (
        <SignIn title="Sign in" />
      )}

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <T v="label" muted>
          Data
        </T>
        <T>
          Drama, cast and image data come from The Movie Database (TMDB). This product uses the TMDB API but is not
          endorsed or certified by TMDB.
        </T>
        <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync('https://www.themoviedb.org/')}>
          <T style={{ color: c.jade }}>themoviedb.org</T>
        </Pressable>
      </View>

      <T v="small" muted>
        Version {Constants.expoConfig?.version ?? '1.0.0'}
      </T>
    </ScrollView>
  );
}

function SignedIn({ email }: { email: string }) {
  const c = useColors();
  const { signOut, deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'signout' | 'delete' | null>(null);
  const [error, setError] = useState('');

  const run = async (kind: 'signout' | 'delete') => {
    setBusy(kind);
    setError('');
    try {
      await (kind === 'signout' ? signOut() : deleteAccount());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <T v="label" muted>
        Signed in as
      </T>
      <T v="heading">{email}</T>
      <T v="small" muted>
        Your diary syncs to this account on every device you sign in on.
      </T>

      <Pressable
        accessibilityRole="button"
        disabled={!!busy}
        onPress={() => run('signout')}
        style={({ pressed }) => [styles.button, { borderColor: c.line, opacity: pressed ? 0.7 : 1 }]}>
        {busy === 'signout' ? (
          <ActivityIndicator color={c.ink} />
        ) : (
          <Text style={[styles.buttonText, { color: c.ink }]}>Sign out</Text>
        )}
      </Pressable>

      {!confirming ? (
        <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => setConfirming(true)} style={styles.link}>
          <T style={{ color: c.danger }}>Delete account</T>
        </Pressable>
      ) : (
        <View style={[styles.confirm, { borderColor: c.danger }]}>
          <T v="heading">Delete your account?</T>
          <T muted>
            This permanently deletes your account and your whole diary: every rating, note and favorite. It can’t be
            undone.
          </T>
          <Pressable
            accessibilityRole="button"
            disabled={!!busy}
            onPress={() => run('delete')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: c.danger, borderColor: c.danger, opacity: pressed ? 0.7 : 1 },
            ]}>
            {busy === 'delete' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { color: '#fff' }]}>Delete my account and diary</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!!busy}
            onPress={() => setConfirming(false)}
            style={styles.link}>
            <T>Cancel</T>
          </Pressable>
        </View>
      )}

      {error ? (
        <T v="small" style={{ color: c.danger }} accessibilityRole="alert">
          {error}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Space.lg, gap: Space.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Space.lg, gap: Space.sm },
  button: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Space.sm,
    minHeight: 46,
    justifyContent: 'center',
  },
  buttonText: { fontFamily: Fonts.sans, fontSize: 16 },
  link: { alignItems: 'center', paddingVertical: Space.sm },
  confirm: { borderWidth: 1, borderRadius: Radius.md, padding: Space.md, gap: Space.sm, marginTop: Space.sm },
});
