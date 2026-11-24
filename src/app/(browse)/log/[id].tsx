import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { SheetScroll, SheetTextInput } from '@/components/sheet-scroll';
import { SignIn } from '@/components/sign-in';
import { StarInput } from '@/components/stars';
import { Loading, Message, T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  DATE_LABEL,
  formFromEntry,
  STATUS_LABEL,
  useDeleteEntry,
  useEntry,
  useSaveEntry,
  type DiaryEntry,
  type EntryForm,
  type Status,
} from '@/lib/diary';
import { showDetail, type ShowDetail } from '@/lib/tmdb';

/** Sheet for adding a drama to the diary or editing its log. */
export default function LogSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const showId = Number(id);
  const { session, ready } = useAuth();
  const show = useQuery({ queryKey: ['show', id], queryFn: () => showDetail(showId) });
  const { entry, isPending: diaryPending } = useEntry(showId);

  if (!ready || show.isPending) return <Loading />;
  if (show.isError) return <Message title="Couldn’t load this drama" body={show.error.message} />;
  if (!session) {
    return (
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <SignIn
          title="Sign in to log dramas"
          subtitle={`Sign in to add ${show.data.name} to your diary. New here? Create an account with your email and a password.`}
        />
      </ScrollView>
    );
  }
  if (diaryPending) return <Loading />;

  // A new key when the saved entry changes gives the form fresh starting values.
  return <LogForm key={entry?.updated_at ?? 'new'} show={show.data} entry={entry} />;
}

function LogForm({ show: d, entry }: { show: ShowDetail; entry: DiaryEntry | undefined }) {
  const c = useColors();
  const save = useSaveEntry();
  const remove = useDeleteEntry();
  const [form, setForm] = useState<EntryForm>(() => formFromEntry(entry));
  const total = d.number_of_episodes ?? 0;
  const set = (patch: Partial<EntryForm>) => setForm((f) => ({ ...f, ...patch }));
  const error = save.error ?? remove.error;

  // Saving refetches the diary, which remounts this form (see the key above) before a
  // mutate() onSuccess callback could run, so close the sheet from the awaited promise.
  const onSave = () => save.mutateAsync({ show: d, form }).then(close, () => {});
  const onRemove = () => remove.mutateAsync(d.id).then(close, () => {});

  return (
    <SheetScroll contentContainerStyle={styles.wrap}>
      <View>
        <T v="label" muted>
          {entry ? 'Edit your log' : 'Add to your diary'}
        </T>
        <T v="title">{d.name}</T>
      </View>

      <View style={[styles.segment, { borderColor: c.line }]} accessibilityRole="radiogroup">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => {
          const on = form.status === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => set({ status: s })}
              style={[styles.segmentItem, { backgroundColor: on ? c.ink : 'transparent' }]}>
              <Text style={{ fontFamily: Fonts.sans, fontSize: 15, color: on ? c.bg : c.muted }}>
                {STATUS_LABEL[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {form.status === 'watching' ? (
        <View style={styles.field}>
          <T v="label" muted>
            Progress
          </T>
          <View style={styles.stepper}>
            <StepButton
              label="−"
              a11y="One episode back"
              onPress={() => set({ episodesWatched: Math.max(0, form.episodesWatched - 1) })}
            />
            <T v="heading" style={{ minWidth: 150, textAlign: 'center' }}>
              Episode {form.episodesWatched}
              {total ? ` of ${total}` : ''}
            </T>
            <StepButton
              label="+"
              a11y="One more episode"
              onPress={() =>
                set({ episodesWatched: total ? Math.min(total, form.episodesWatched + 1) : form.episodesWatched + 1 })
              }
            />
          </View>
        </View>
      ) : null}

      {form.status !== 'want' ? (
        <View style={styles.field}>
          <T v="label" muted>
            Your rating
          </T>
          <View style={styles.ratingRow}>
            <StarInput value={form.rating} onChange={(rating) => set({ rating })} />
            <T v="heading" muted style={{ minWidth: 34 }}>
              {form.rating ? form.rating.toFixed(1) : ''}
            </T>
          </View>
          <T v="small" muted>
            Tap the left half of a star for a half star.
          </T>
        </View>
      ) : null}

      <DateField label={DATE_LABEL[form.status]} value={form.loggedOn} onChange={(loggedOn) => set({ loggedOn })} />

      <View style={styles.field}>
        <T v="label" muted>
          Notes
        </T>
        <SheetTextInput
          value={form.note}
          onChangeText={(note) => set({ note })}
          placeholder="What stayed with you? Favorite scene, the second lead you were rooting for…"
          placeholderTextColor={c.muted}
          multiline
          maxLength={5000}
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
        onPress={onSave}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: c.accent, opacity: pressed || save.isPending ? 0.7 : 1 },
        ]}>
        {save.isPending ? (
          <ActivityIndicator color={c.onAccent} />
        ) : (
          <Text style={{ color: c.onAccent, fontFamily: Fonts.sans, fontSize: 17 }}>
            {entry ? 'Save changes' : 'Add to diary'}
          </Text>
        )}
      </Pressable>

      {entry ? (
        <Pressable accessibilityRole="button" disabled={remove.isPending} onPress={onRemove} style={styles.remove}>
          <T style={{ color: c.danger }}>{remove.isPending ? 'Removing…' : 'Remove from diary'}</T>
        </Pressable>
      ) : null}
    </SheetScroll>
  );
}

function close() {
  if (router.canGoBack()) router.back();
}

function StepButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.step, { borderColor: c.line, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={{ fontSize: 22, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Space.lg, paddingTop: Space.xl, gap: Space.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  field: { gap: Space.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  note: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Space.md,
    minHeight: 100,
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
