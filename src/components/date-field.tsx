import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { addDays, addMonths, friendlyDate, monthGrid, MONTHS_LONG, parseISO, toISO, todayISO } from '@/lib/dates';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * A date with Today / Yesterday shortcuts and a calendar that opens in place.
 * Future dates can't be picked: you can't have finished a drama tomorrow.
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const c = useColors();
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <T v="label" muted>
        {label}
      </T>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${friendlyDate(value, today)}`}
          accessibilityHint={open ? 'Closes the calendar' : 'Opens a calendar'}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => [
            styles.value,
            { borderColor: open ? c.ink : c.line, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 16, color: c.ink }}>{friendlyDate(value, today)}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
        </Pressable>
        {value !== today ? <Chip label="Today" onPress={() => onChange(today)} /> : null}
        {value !== yesterday ? <Chip label="Yesterday" onPress={() => onChange(yesterday)} /> : null}
      </View>
      {open ? (
        <Calendar
          value={value}
          max={today}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

function Calendar({ value, max, onPick }: { value: string; max: string; onPick: (iso: string) => void }) {
  const c = useColors();
  const [view, setView] = useState(() => {
    const { year, month } = parseISO(value);
    return { year, month };
  });
  const maxD = parseISO(max);
  const atMax = view.year * 12 + view.month >= maxD.year * 12 + maxD.month;
  const step = (n: number) => setView((v) => addMonths(v.year, v.month, n));

  return (
    <View style={[styles.calendar, { borderColor: c.line, backgroundColor: c.surface }]}>
      <View style={styles.calHeader}>
        <NavButton label="‹" a11y="Previous month" onPress={() => step(-1)} />
        <T v="heading" accessibilityRole="header">
          {MONTHS_LONG[view.month - 1]} {view.year}
        </T>
        <NavButton label="›" a11y="Next month" disabled={atMax} onPress={() => step(1)} />
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <View key={i} style={styles.cell}>
            <T v="small" muted>
              {d}
            </T>
          </View>
        ))}
      </View>
      {monthGrid(view.year, view.month).map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            if (day == null) return <View key={i} style={styles.cell} />;
            const iso = toISO(view.year, view.month, day);
            const selected = iso === value;
            const future = iso > max;
            const isToday = iso === max;
            return (
              <Pressable
                key={i}
                disabled={future}
                accessibilityRole="button"
                accessibilityLabel={`${WEEKDAYS_LONG[i]}, ${MONTHS_LONG[view.month - 1]} ${day}, ${view.year}${isToday ? ', today' : ''}`}
                accessibilityState={{ selected, disabled: future }}
                onPress={() => onPick(iso)}
                style={styles.cell}>
                {({ pressed }) => (
                  <View
                    style={[
                      styles.day,
                      selected ? { backgroundColor: c.ink } : pressed ? { backgroundColor: c.surface2 } : null,
                    ]}>
                    <Text
                      style={{
                        fontFamily: Fonts.sans,
                        fontSize: 16,
                        color: selected ? c.bg : future ? c.line : isToday ? c.jade : c.ink,
                        textDecorationLine: isToday && !selected ? 'underline' : 'none',
                      }}>
                      {day}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function NavButton({
  label,
  a11y,
  disabled,
  onPress,
}: {
  label: string;
  a11y: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.nav, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Text style={{ fontSize: 26, lineHeight: 28, color: c.jade }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: 8,
  },
  calendar: { borderWidth: 1, borderRadius: Radius.lg, padding: Space.sm, maxWidth: 360 },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xs,
    paddingBottom: Space.sm,
  },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
