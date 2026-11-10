import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Headshot, Loading, Message, Poster, T, Tag } from '@/components/ui';
import { Radius, Space, useColors } from '@/constants/theme';
import { imageUrl, showDetail, topCast, yearOf } from '@/lib/tmdb';

export default function DramaScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const show = useQuery({ queryKey: ['show', id], queryFn: () => showDetail(Number(id)) });
  const [expanded, setExpanded] = useState(false);

  if (show.isPending) return <Loading />;
  if (show.isError) return <Message title="Couldn’t load this drama" body={show.error.message} action={{ label: 'Try again', onPress: () => show.refetch() }} />;

  const d = show.data;
  const year = yearOf(d.first_air_date);
  const runtime = d.episode_run_time?.[0];
  const cast = topCast(d.aggregate_credits?.cast);
  const backdrop = imageUrl(d.backdrop_path, 'w780');
  const facts = [
    year,
    d.networks?.[0]?.name,
    d.number_of_episodes ? `${d.number_of_episodes} episodes` : '',
    d.number_of_seasons && d.number_of_seasons > 1 ? `${d.number_of_seasons} seasons` : '',
    runtime ? `${runtime} min` : '',
  ].filter(Boolean);
  const contentWidth = Math.min(width, 760);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: Space.xxl }}>
      <Stack.Screen options={{ title: d.name }} />
      {backdrop ? <Image source={{ uri: backdrop }} style={[styles.backdrop, { backgroundColor: c.surface2 }]} contentFit="cover" transition={200} accessibilityIgnoresInvertColors /> : null}

      <View style={[styles.body, { width: contentWidth }]}>
        <View style={[styles.top, backdrop ? { marginTop: -56 } : null]}>
          <View style={[styles.posterShadow, { borderColor: c.bg }]}>
            <Poster path={d.poster_path} title={d.name} width={112} />
          </View>
          <View style={styles.titles}>
            <T v="title">{d.name}</T>
            {d.original_name && d.original_name !== d.name ? (
              <T v="body" muted>
                {d.original_name}
              </T>
            ) : null}
            <T v="small" muted>
              {facts.join(' · ')}
            </T>
          </View>
        </View>

        {d.genres.length ? (
          <View style={styles.tags}>
            {d.genres.map((g) => (
              <Tag key={g.id} label={g.name} />
            ))}
          </View>
        ) : null}

        {d.tagline ? (
          <T v="heading" style={{ fontStyle: 'italic' }}>
            {d.tagline}
          </T>
        ) : null}

        {d.overview ? (
          <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button" accessibilityHint={expanded ? 'Collapses the synopsis' : 'Shows the full synopsis'}>
            <T numberOfLines={expanded ? undefined : 5}>{d.overview}</T>
            {d.overview.length > 280 ? (
              <T v="small" style={{ color: c.jade, marginTop: 4 }}>
                {expanded ? 'Show less' : 'Read more'}
              </T>
            ) : null}
          </Pressable>
        ) : (
          <T muted>TMDB doesn’t have a synopsis for this drama yet.</T>
        )}
      </View>

      {cast.length ? (
        <View style={{ marginTop: Space.xl }}>
          <T v="heading" style={[styles.sectionTitle, { width: contentWidth }]}>
            Cast
          </T>
          <FlatList
            horizontal
            data={cast}
            keyExtractor={(m) => String(m.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Space.md, paddingHorizontal: Math.max(Space.lg, (width - contentWidth) / 2 + Space.lg) }}
            renderItem={({ item }) => (
              <Link href={{ pathname: '/actor/[id]', params: { id: String(item.id) } }} asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}${item.character ? ` as ${item.character}` : ''}`} style={({ pressed }) => [styles.castCard, { opacity: pressed ? 0.7 : 1 }]}>
                  <Headshot path={item.profile_path} name={item.name} size={76} />
                  <T v="small" numberOfLines={2} style={styles.center}>
                    {item.name}
                  </T>
                  {item.character ? (
                    <T v="small" muted numberOfLines={2} style={styles.center}>
                      {item.character}
                    </T>
                  ) : null}
                </Pressable>
              </Link>
            )}
          />
        </View>
      ) : null}

      <View style={[styles.body, { width: contentWidth, marginTop: Space.xl }]}>
        <View style={[styles.factsBox, { borderColor: c.line }]}>
          <Fact label="Status" value={d.status} />
          <Fact label="First aired" value={d.first_air_date} />
          <Fact label="TMDB rating" value={d.vote_average ? `${d.vote_average.toFixed(1)} / 10` : '—'} />
        </View>
      </View>
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.fact}>
      <T v="label" muted>
        {label}
      </T>
      <T>{value || '—'}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { width: '100%', aspectRatio: 16 / 9, maxHeight: 360 },
  body: { alignSelf: 'center', paddingHorizontal: Space.lg, gap: Space.lg },
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: Space.lg, marginTop: Space.lg },
  posterShadow: { borderWidth: 3, borderRadius: Radius.sm + 3 },
  titles: { flex: 1, minWidth: 0, gap: 2, paddingBottom: Space.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sectionTitle: { alignSelf: 'center', paddingHorizontal: Space.lg, marginBottom: Space.md },
  castCard: { width: 92, alignItems: 'center', gap: 4 },
  center: { textAlign: 'center' },
  factsBox: { borderTopWidth: 1, paddingTop: Space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: Space.xl },
  fact: { gap: 2, minWidth: 120 },
});
