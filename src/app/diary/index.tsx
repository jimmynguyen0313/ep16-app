import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { SignIn } from '@/components/sign-in';
import { StarText } from '@/components/stars';
import { Chip, Headshot, Loading, Message, Poster, T } from '@/components/ui';
import { Space, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import { diaryStats, STATUS_LABEL, useDiary, type DiaryEntry, type Status } from '@/lib/diary';
import { useFavorites } from '@/lib/favorites';
import { rewatchCounts, useRewatches } from '@/lib/rewatches';

type Filter = 'all' | Status;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'watching', label: 'Watching' },
  { key: 'watched', label: 'Watched' },
  { key: 'want', label: 'Want to watch' },
];

export default function DiaryScreen() {
  const c = useColors();
  const { session, ready } = useAuth();
  const diary = useDiary();
  const rewatches = useRewatches();
  const counts = useMemo(() => rewatchCounts(rewatches.data ?? []), [rewatches.data]);
  const [filter, setFilter] = useState<Filter>('all');
  const entries = useMemo(() => diary.data ?? [], [diary.data]);
  const shown = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.status === filter)),
    [entries, filter],
  );

  if (!ready) return <Loading />;
  if (!session) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled">
        <SignIn subtitle="Your diary keeps every K-drama you’ve watched, are watching, or want to see, with your ratings and notes, synced across your devices." />
      </ScrollView>
    );
  }
  if (diary.isPending) return <Loading />;
  if (diary.isError)
    return (
      <Message
        title="Couldn’t load your diary"
        body={diary.error.message}
        action={{ label: 'Try again', onPress: () => diary.refetch() }}
      />
    );

  const stats = diaryStats(entries);

  const header = (
    <View style={styles.header}>
      {entries.length ? (
        <View style={styles.stats}>
          <Stat n={stats.watched} label="watched" />
          <Stat n={stats.watching} label="watching" />
          <Stat n={stats.want} label="to watch" />
          {stats.average != null ? <Stat n={stats.average.toFixed(1)} label="avg rating" /> : null}
        </View>
      ) : null}
      {stats.watched || (rewatches.data ?? []).length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Wrapped, your year in K-dramas"
          onPress={() => router.push('/diary/wrapped')}
          style={({ pressed }) => [styles.wrapped, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}>
          <View style={{ flex: 1 }}>
            <T v="label" style={{ color: c.onAccent, opacity: 0.8 }}>
              Wrapped
            </T>
            <T v="heading" style={{ color: c.onAccent }}>
              Your year in K-dramas
            </T>
          </View>
          <T v="title" style={{ color: c.onAccent }}>
            ›
          </T>
        </Pressable>
      ) : null}
      <FavoriteActors />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      data={shown}
      keyExtractor={(e) => String(e.show_id)}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.line }]} />}
      refreshControl={
        <RefreshControl
          refreshing={diary.isRefetching}
          onRefresh={() => void Promise.all([diary.refetch(), rewatches.refetch()])}
          tintColor={c.muted}
        />
      }
      renderItem={({ item }) => <Row entry={item} rewatched={counts.get(item.show_id) ?? 0} />}
      ListEmptyComponent={
        entries.length ? (
          <T muted style={styles.pad}>
            Nothing marked “{FILTERS.find((f) => f.key === filter)?.label}” yet.
          </T>
        ) : (
          <View style={styles.pad}>
            <Message
              title="Your diary is empty"
              body="Open any drama in Browse and tap Add to diary to log it."
              action={{ label: 'Browse dramas', onPress: () => router.navigate('/') }}
            />
          </View>
        )
      }
    />
  );
}

function FavoriteActors() {
  const favorites = useFavorites();
  const list = favorites.data ?? [];
  if (!list.length) return null;
  return (
    <View style={{ gap: Space.sm }}>
      <T v="label" muted>
        Favorite actors
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.md }}>
        {list.map((a) => (
          <Pressable
            key={a.person_id}
            accessibilityRole="button"
            accessibilityLabel={a.name}
            onPress={() => router.push({ pathname: '/actor/[id]', params: { id: String(a.person_id) } })}
            style={({ pressed }) => [styles.actor, { opacity: pressed ? 0.7 : 1 }]}>
            <Headshot path={a.profile_path} name={a.name} size={64} />
            <T v="small" numberOfLines={2} style={{ textAlign: 'center' }}>
              {a.name}
            </T>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <T v="title">{n}</T>
      <T muted>{label}</T>
    </View>
  );
}

function Row({ entry: e, rewatched }: { entry: DiaryEntry; rewatched: number }) {
  const c = useColors();
  const detail =
    e.status === 'watching'
      ? `Episode ${e.episodes_watched}${e.total_episodes ? ` of ${e.total_episodes}` : ''}`
      : e.status === 'want'
        ? STATUS_LABEL.want
        : rewatched
          ? `Watched ${rewatched + 1} times`
          : '';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/drama/[id]', params: { id: String(e.show_id) } })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <Poster path={e.poster_path} title={e.title} width={52} radius={4} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T v="heading" numberOfLines={2}>
          {e.title}
        </T>
        {detail ? (
          <T v="small" muted>
            {detail}
          </T>
        ) : null}
        {e.note ? (
          <T v="small" muted numberOfLines={2}>
            {e.note}
          </T>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StarText rating={e.rating} />
        <T v="small" muted style={{ fontVariant: ['tabular-nums'] }}>
          {formatDate(e.logged_on)}
        </T>
      </View>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: e.status === 'watched' ? c.jade : e.status === 'watching' ? c.star : c.line },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Space.lg },
  list: { paddingBottom: Space.xxl, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.lg, gap: Space.lg },
  wrapped: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  actor: { width: 76, alignItems: 'center', gap: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: Space.lg },
  statusDot: { position: 'absolute', left: 6, top: '50%', width: 4, height: 24, marginTop: -12, borderRadius: 2 },
});
