import { useQueries, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StarText } from '@/components/stars';
import { Chip, Headshot, Loading, Message, Poster, T } from '@/components/ui';
import { Radius, Space, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { MONTHS_LONG } from '@/lib/dates';
import { useDiary } from '@/lib/diary';
import { useRewatches } from '@/lib/rewatches';
import { genreNames, hasToken, showDetail, tvGenres } from '@/lib/tmdb';
import { topActors, wrappedYears, wrapYear } from '@/lib/wrapped';

/** Casts are fetched for at most this many dramas per year, to stay well inside TMDB's rate limit. */
const MAX_CASTS = 40;

/** A year in K-dramas: what you finished, how much you watched, what you loved, who you kept watching. */
export default function WrappedScreen() {
  const c = useColors();
  const { session, ready } = useAuth();
  const diary = useDiary();
  const rewatches = useRewatches();
  const entries = useMemo(() => diary.data ?? [], [diary.data]);
  const rewatchList = useMemo(() => rewatches.data ?? [], [rewatches.data]);
  const years = useMemo(() => wrappedYears(entries, rewatchList), [entries, rewatchList]);
  const [picked, setPicked] = useState<number | undefined>();
  const year = picked ?? years[0] ?? new Date().getFullYear();
  const w = useMemo(() => wrapYear(entries, rewatchList, year), [entries, rewatchList, year]);

  const genres = useQuery({ queryKey: ['genres'], queryFn: tvGenres, staleTime: Infinity, enabled: hasToken() });
  const casts = useQueries({
    queries: w.finished.slice(0, MAX_CASTS).map((e) => ({
      // Same key as the drama page, so casts already viewed come from the cache.
      queryKey: ['show', String(e.show_id)],
      queryFn: () => showDetail(e.show_id),
      enabled: hasToken(),
    })),
  });
  const castsLoading = casts.some((q) => q.isPending);
  const actors = castsLoading ? [] : topActors(casts.map((q) => q.data?.aggregate_credits?.cast ?? []));

  if (!ready || (session && (diary.isPending || rewatches.isPending))) return <Loading />;
  if (!session) return <Message title="Sign in to see your Wrapped" />;
  if (diary.isError) return <Message title="Couldn’t load your diary" body={diary.error.message} />;
  if (!years.length)
    return (
      <Message
        title="Nothing to wrap yet"
        body="Mark a drama as Watched and your year in K-dramas will show up here."
      />
    );

  const genreLabels = w.topGenres.map((g, i) => ({
    ...g,
    name: genreNames([g.id], genres.data?.genres)[0] ?? `#${i + 1}`,
  }));
  const busiest = w.busiestMonth ? MONTHS_LONG[w.busiestMonth.month - 1] : null;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.wrap}>
      {years.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
          {years.map((y) => (
            <Chip key={y} label={String(y)} selected={y === year} onPress={() => setPicked(y)} />
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.hero, { backgroundColor: c.accent }]}>
        <T v="label" style={{ color: c.onAccent, opacity: 0.8 }}>
          Your {year} in K-dramas
        </T>
        <T v="display" style={{ color: c.onAccent, fontSize: 64, lineHeight: 68 }}>
          {w.finished.length}
        </T>
        <T v="heading" style={{ color: c.onAccent }}>
          {w.finished.length === 1 ? 'drama finished' : 'dramas finished'}
        </T>
        <View style={styles.heroStats}>
          {w.episodes ? <HeroStat n={w.episodes.toLocaleString()} label="episodes" /> : null}
          {w.rewatches ? <HeroStat n={w.rewatches} label={w.rewatches === 1 ? 'rewatch' : 'rewatches'} /> : null}
          {w.average != null ? <HeroStat n={`${w.average.toFixed(1)}★`} label="average" /> : null}
        </View>
      </View>

      {w.busiestMonth && w.busiestMonth.count > 1 ? (
        <Card title="Busiest month">
          <T v="title">{busiest}</T>
          <T muted>{w.busiestMonth.count} dramas finished. Who needs sleep?</T>
        </Card>
      ) : null}

      {genreLabels.length ? (
        <Card title="Top genres">
          {genreLabels.map((g, i) => (
            <View key={g.id} style={styles.rank}>
              <T v="heading" muted style={styles.rankN}>
                {i + 1}
              </T>
              <T v="heading" style={{ flex: 1 }}>
                {g.name}
              </T>
              <T muted>
                {g.count} {g.count === 1 ? 'drama' : 'dramas'}
              </T>
            </View>
          ))}
        </Card>
      ) : null}

      {w.topRated.length ? (
        <Card title="Highest rated">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.md }}>
            {w.topRated.map((e) => (
              <Pressable
                key={e.show_id}
                accessibilityRole="button"
                accessibilityLabel={`${e.title}, rated ${e.rating}`}
                onPress={() => router.push({ pathname: '/drama/[id]', params: { id: String(e.show_id) } })}
                style={({ pressed }) => [{ width: 96, gap: 4, opacity: pressed ? 0.75 : 1 }]}>
                <Poster path={e.poster_path} title={e.title} width={96} />
                <T v="small" numberOfLines={2}>
                  {e.title}
                </T>
                <StarText rating={e.rating} size={12} />
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      ) : null}

      {w.finished.length >= 2 ? (
        <Card title="Actors you kept watching">
          {castsLoading ? (
            <T muted>Counting casts…</T>
          ) : actors.length ? (
            actors.map((a) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${a.name}, in ${a.dramas} of your dramas`}
                onPress={() => router.push({ pathname: '/actor/[id]', params: { id: String(a.id) } })}
                style={({ pressed }) => [styles.rank, { opacity: pressed ? 0.7 : 1 }]}>
                <Headshot path={a.profile_path} name={a.name} size={44} />
                <T v="heading" style={{ flex: 1 }} numberOfLines={1}>
                  {a.name}
                </T>
                <T muted>{a.dramas} dramas</T>
              </Pressable>
            ))
          ) : (
            <T muted>No actor showed up in more than one of this year’s dramas.</T>
          )}
        </Card>
      ) : null}

      <Card title={`Finished in ${year}`}>
        {w.finished.map((e) => (
          <Pressable
            key={e.show_id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/drama/[id]', params: { id: String(e.show_id) } })}
            style={({ pressed }) => [styles.rank, { opacity: pressed ? 0.7 : 1 }]}>
            <T v="small" muted style={{ width: 34 }}>
              {MONTHS_LONG[Number(e.logged_on.slice(5, 7)) - 1].slice(0, 3)}
            </T>
            <T style={{ flex: 1 }} numberOfLines={1}>
              {e.title}
            </T>
            <StarText rating={e.rating} size={12} />
          </Pressable>
        ))}
        {!w.finished.length ? <T muted>Only rewatches this year.</T> : null}
      </Card>
    </ScrollView>
  );
}

function HeroStat({ n, label }: { n: number | string; label: string }) {
  const c = useColors();
  return (
    <View>
      <T v="title" style={{ color: c.onAccent }}>
        {n}
      </T>
      <T v="small" style={{ color: c.onAccent, opacity: 0.8 }}>
        {label}
      </T>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <T v="label" muted>
        {title}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: Space.lg,
    paddingBottom: Space.xxl,
    gap: Space.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: { borderRadius: Radius.lg, padding: Space.xl, gap: Space.xs },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xl, marginTop: Space.md },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Space.lg, gap: Space.md },
  rank: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  rankN: { width: 20 },
});
