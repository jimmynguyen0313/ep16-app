import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { Radius, Space, useColors } from '@/constants/theme';

export default function AboutScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[
        styles.wrap,
        {
          paddingTop: insets.top + Space.xl,
          paddingBottom: insets.bottom + Space.xxl,
        },
      ]}>
      <T v="display">Ep.16</T>
      <T muted>A diary for every K-drama you’ve watched, rated, and loved (or didn’t).</T>

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

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Space.lg,
    gap: Space.lg,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Space.lg,
    gap: Space.sm,
  },
});
