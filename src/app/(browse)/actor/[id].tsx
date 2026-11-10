import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Headshot, Loading, Message, Poster, T } from '@/components/ui';
import { Space, useColors } from '@/constants/theme';
import { kdramaCredits, person, yearOf, type TvCredit } from '@/lib/tmdb';

/** An actor's page: photo, short bio, and every K-drama TMDB credits them in. */
export default function ActorScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useQuery({
    queryKey: ['person', id],
    queryFn: () => person(Number(id)),
  });
  const [expanded, setExpanded] = useState(false);
  const dramas = useMemo(() => kdramaCredits(p.data?.tv_credits?.cast ?? []), [p.data]);

  if (p.isPending) return <Loading />;
  if (p.isError)
    return (
      <Message
        title="Couldn’t load this actor"
        body={p.error.message}
        action={{ label: 'Try again', onPress: () => p.refetch() }}
      />
    );

  const a = p.data;
  const korean = a.also_known_as.find((n) => /[가-힣]/.test(n));
  const contentWidth = Math.min(width, 900);
  const cols = contentWidth < 600 ? 3 : contentWidth < 820 ? 4 : 5;
  const gap = Space.md;
  const tileW = Math.floor((contentWidth - Space.lg * 2 - gap * (cols - 1)) / cols);
  const born = [a.birthday ? `Born ${a.birthday}` : '', a.place_of_birth ?? ''].filter(Boolean).join(' · ');

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <Headshot path={a.profile_path} name={a.name} size={96} />
        <View style={styles.titles}>
          <T v="title">{a.name}</T>
          {korean ? <T muted>{korean}</T> : null}
          {born ? (
            <T v="small" muted>
              {born}
            </T>
          ) : null}
        </View>
      </View>
      {a.biography ? (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityHint={expanded ? 'Collapses the biography' : 'Shows the full biography'}>
          <T numberOfLines={expanded ? undefined : 4}>{a.biography}</T>
          {a.biography.length > 240 ? (
            <T v="small" style={{ color: c.jade, marginTop: 4 }}>
              {expanded ? 'Show less' : 'Read more'}
            </T>
          ) : null}
        </Pressable>
      ) : null}
      <T v="heading" style={{ marginTop: Space.sm }}>
        {dramas.length ? `${dramas.length} K-${dramas.length === 1 ? 'drama' : 'dramas'}` : 'K-dramas'}
      </T>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: a.name }} />
      <FlatList
        key={cols}
        data={dramas}
        numColumns={cols}
        keyExtractor={(d) => d.credit_id}
        style={{ backgroundColor: c.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          alignSelf: 'center',
          width: contentWidth,
          paddingBottom: Space.xxl,
        }}
        columnWrapperStyle={{ gap, paddingHorizontal: Space.lg }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <T muted style={{ paddingHorizontal: Space.lg }}>
            TMDB doesn’t list any K-dramas for {a.name}.
          </T>
        }
        renderItem={({ item }) => <CreditTile credit={item} width={tileW} />}
      />
    </>
  );
}

function CreditTile({ credit, width }: { credit: TvCredit; width: number }) {
  const year = yearOf(credit.first_air_date);
  return (
    <View style={{ width, marginBottom: Space.lg }}>
      <Link href={{ pathname: '/drama/[id]', params: { id: String(credit.id) } }} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${credit.name}${year ? `, ${year}` : ''}${credit.character ? `, as ${credit.character}` : ''}`}
          style={({ pressed }) => ({ width, opacity: pressed ? 0.75 : 1 })}>
          <Poster path={credit.poster_path} title={credit.name} width={width} />
          <T v="small" numberOfLines={2} style={{ marginTop: 6 }}>
            {credit.name}
          </T>
          <T v="small" muted numberOfLines={2}>
            {[year, credit.character ? `as ${credit.character}` : ''].filter(Boolean).join(' · ')}
          </T>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: Space.lg,
    gap: Space.lg,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  titles: { flex: 1, minWidth: 0, gap: 2 },
});
