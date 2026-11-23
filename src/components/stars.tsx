import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useColors } from '@/constants/theme';

const STAR = '★';

/** Read-only stars, e.g. ★★★★½. */
export function StarText({ rating, size = 14 }: { rating: number | null; size?: number }) {
  const c = useColors();
  if (rating == null) return null;
  const full = Math.floor(rating);
  return (
    <Text style={{ color: c.star, fontSize: size, letterSpacing: 1 }} accessibilityLabel={`${rating} out of 5 stars`}>
      {STAR.repeat(full)}
      {rating % 1 ? '½' : ''}
    </Text>
  );
}

/**
 * Tappable 5-star rating with half stars: tap the left half of a star for a half.
 * Tapping the current value again clears it.
 */
export function StarInput({
  value,
  onChange,
  size = 38,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  size?: number;
}) {
  const c = useColors();
  const current = value ?? 0;

  const press = (index: number) => (e: GestureResponderEvent) => {
    const half = e.nativeEvent.locationX < size / 2;
    const next = index + (half ? 0.5 : 1);
    onChange(next === current ? null : next);
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Your rating"
      accessibilityValue={{ text: value ? `${value} out of 5` : 'No rating' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(5, current + 0.5));
        if (e.nativeEvent.actionName === 'decrement') onChange(current - 0.5 >= 0.5 ? current - 0.5 : null);
      }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, current - i));
        return (
          <Pressable key={i} onPress={press(i)} hitSlop={4} style={{ width: size, height: size }}>
            <Text style={[styles.star, { fontSize: size, lineHeight: size, color: c.line }]}>{STAR}</Text>
            <View style={[styles.fill, { width: size * fill }]}>
              <Text style={[styles.star, { fontSize: size, lineHeight: size, color: c.star, width: size }]}>
                {STAR}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { textAlign: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
});
