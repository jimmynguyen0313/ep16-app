import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps, type TextStyle } from 'react-native';

import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { imageUrl, placeholderColor } from '@/lib/tmdb';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: Fonts.serifBold, fontSize: 34, lineHeight: 38 },
  title: { fontFamily: Fonts.serifBold, fontSize: 26, lineHeight: 31 },
  heading: { fontFamily: Fonts.serifBold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
};

export function T({ v = 'body', muted, style, ...rest }: TextProps & { v?: Variant; muted?: boolean }) {
  const c = useColors();
  return <Text {...rest} style={[variants[v], { color: muted ? c.muted : c.ink }, style]} />;
}

/** A poster that falls back to a colored card with the title when TMDB has no image. */
export function Poster({
  path,
  title,
  width,
  radius = Radius.sm,
}: {
  path: string | null;
  title: string;
  width: number;
  radius?: number;
}) {
  const c = useColors();
  const uri = imageUrl(path, width > 160 ? 'w500' : 'w342');
  const [failed, setFailed] = useState(false);
  const box = { width, height: width * 1.5, borderRadius: radius };
  if (!uri || failed) {
    return (
      <View style={[box, styles.fallback, { backgroundColor: placeholderColor(title) }]}>
        <Text style={styles.fallbackText} numberOfLines={4}>
          {title}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[box, { backgroundColor: c.surface2 }]}
      contentFit="cover"
      transition={150}
      recyclingKey={uri}
      accessibilityIgnoresInvertColors
      onError={() => setFailed(true)}
    />
  );
}

/** Round headshot with initials when there's no photo. */
export function Headshot({ path, name, size }: { path: string | null; name: string; size: number }) {
  const uri = imageUrl(path, 'w185');
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (!uri) {
    return (
      <View style={[box, styles.fallback, { backgroundColor: placeholderColor(name) }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.32 }]}>{initials}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={box} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? c.ink : c.line,
          backgroundColor: selected ? c.ink : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text style={[variants.small, { color: selected ? c.bg : c.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={[styles.tag, { backgroundColor: c.surface2 }]}>
      <Text style={[variants.small, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

export function Loading() {
  const c = useColors();
  return (
    <Center>
      <ActivityIndicator color={c.jade} accessibilityLabel="Loading" />
    </Center>
  );
}

export function Message({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  const c = useColors();
  return (
    <Center>
      <View style={[styles.message, { backgroundColor: c.surface, borderColor: c.line }]}>
        <T v="heading" style={{ textAlign: 'center' }}>
          {title}
        </T>
        {body ? (
          <T muted style={{ textAlign: 'center' }}>
            {body}
          </T>
        ) : null}
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={[styles.button, { backgroundColor: c.accent }]}>
            <Text style={[variants.body, { color: c.onAccent }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Center>
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'flex-end',
    padding: Space.sm,
    overflow: 'hidden',
  },
  fallbackText: {
    color: '#fff',
    fontFamily: Fonts.serifBold,
    fontSize: 14,
    lineHeight: 17,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 6,
  },
  tag: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
  },
  message: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Space.xl,
    gap: Space.md,
    alignItems: 'center',
    maxWidth: 420,
  },
  button: {
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingVertical: 10,
    marginTop: Space.xs,
  },
});
