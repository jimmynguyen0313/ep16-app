import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { SheetScroll, SheetTextInput } from '@/components/sheet-scroll';
import { StarInput } from '@/components/stars';
import { Loading, Message, T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  emptyRewatch,
  formFromRewatch,
  useDeleteRewatch,
  useSaveRewatch,
  useShowRewatches,
  type Rewatch,
  type RewatchForm,
} from '@/lib/rewatches';
import { showDetail } from '@/lib/tmdb';

/** Sheet for logging a rewatch of a drama, or editing one (?rewatch=<id>). */
export default function RewatchSheet() {
  const { id, rewatch } = useLocalSearchParams<{ id: string; rewatch?: string }>();
  const showId = Number(id);
  const { session, ready } = useAuth();
  const show = useQuery({ queryKey: ['show', id], queryFn: () => showDetail(showId) });
  const { rewatches, isPending } = useShowRewatches(showId);

  if (!ready || show.isPending || (session && isPending)) return <Loading />;
  if (show.isError) return <Message title="Couldn’t load this drama" body={show.error.message} />;
  if (!session) return <Message title="Sign in to log rewatches" />;

  const existing = rewatch ? rewatches.find((r) => r.id === Number(rewatch)) : undefined;
  if (rewatch && !existing) return <Message title="That rewatch was removed" />;
  return <RewatchFormView showId={showId} title={show.data.name} existing={existing} />;
}

function RewatchFormView({ showId, title, existing }: { showId: number; title: string; existing?: Rewatch }) {
  const c = useColors();
  const save = useSaveRewatch();
  const remove = useDeleteRewatch();
  const [form, setForm] = useState<RewatchForm>(() => (existing ? formFromRewatch(existing) : emptyRewatch()));
  const set = (patch: Partial<RewatchForm>) => setForm((f) => ({ ...f, ...patch }));
  const error = save.error ?? remove.error;

  return (
    <SheetScroll contentContainerStyle={styles.wrap}>
      <View>
        <T v="label" muted>
          {existing ? 'Edit rewatch' : 'Log a rewatch'}
        </T>
        <T v="title">{title}</T>
      </View>

      <DateField label="Rewatched on" value={form.watchedOn} onChange={(watchedOn) => set({ watchedOn })} />

      <View style={styles.field}>
        <T v="label" muted>
          Rating this time
        </T>
        <View style={styles.ratingRow}>
          <StarInput value={form.rating} onChange={(rating) => set({ rating })} />
          <T v="heading" muted style={{ minWidth: 34 }}>
            {form.rating ? form.rating.toFixed(1) : ''}
          </T>
        </View>
      </View>

      <View style={styles.field}>
        <T v="label" muted>
          Notes
        </T>
        <SheetTextInput
          value={form.note}
          onChangeText={(note) => set({ note })}
          placeholder="Did it hit differently the second time?"
          placeholderTextColor={c.muted}
          multiline
          maxLength={2000}
          accessibilityLabel="Notes"
          style={[
            styles.note,
            { color: c.ink, backgroundColor: c.surface, borderColor: c.line, fontFamily: Fonts.sans },
          ]}
        />
      </View>

      {error ? (
        <T v="small" style={{ color: c.danger }} accessibilityRole="alert">
          {error.message}
        </T>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={save.isPending}
        onPress={() => save.mutateAsync({ showId, id: existing?.id, form }).then(close, () => {})}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: c.accent, opacity: pressed || save.isPending ? 0.7 : 1 },
        ]}>
        {save.isPending ? (
          <ActivityIndicator color={c.onAccent} />
        ) : (
          <Text style={{ color: c.onAccent, fontFamily: Fonts.sans, fontSize: 17 }}>
            {existing ? 'Save changes' : 'Log rewatch'}
          </Text>
        )}
      </Pressable>

      {existing ? (
        <Pressable
          accessibilityRole="button"
          disabled={remove.isPending}
          onPress={() => remove.mutateAsync(existing.id).then(close, () => {})}
          style={styles.remove}>
          <T style={{ color: c.danger }}>{remove.isPending ? 'Removing…' : 'Remove this rewatch'}</T>
        </Pressable>
      ) : null}
    </SheetScroll>
  );
}

function close() {
  if (router.canGoBack()) router.back();
}

const styles = StyleSheet.create({
  wrap: { padding: Space.lg, paddingTop: Space.xl, gap: Space.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  field: { gap: Space.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  note: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Space.md,
    minHeight: 90,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  primary: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  remove: { alignItems: 'center', paddingVertical: Space.sm },
});
