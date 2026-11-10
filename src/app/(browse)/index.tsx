import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { Chip, Loading, Message, Poster, T } from '@/components/ui';
import { Fonts, Radius, Space, useColors } from '@/constants/theme';
import { discoverKdramas, hasToken, NON_DRAMA_GENRES, searchKdramas, tvGenres, yearOf, type ShowSummary } from '@/lib/tmdb';

const MAX_PAGES = 25;

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function BrowseScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 350);
  const [genre, setGenre] = useState<number | undefined>();

  const genres = useQuery({ queryKey: ['genres'], queryFn: tvGenres, staleTime: Infinity, enabled: hasToken() });
  const shows = useInfiniteQuery({
    queryKey: ['shows', q, q ? undefined : genre],
    queryFn: ({ pageParam }) => (q ? searchKdramas(q, pageParam) : discoverKdramas(pageParam, genre)),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < Math.min(last.total_pages, MAX_PAGES) ? last.page + 1 : undefined),
    enabled: hasToken(),
    placeholderData: (prev) => prev,
  });

  const items = useMemo(() => {
    const seen = new Set<number>();
    return (shows.data?.pages ?? []).flatMap((p) => p.results).filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  }, [shows.data]);

  const contentWidth = Math.min(width, 1100);
  const cols = contentWidth < 600 ? 3 : contentWidth < 900 ? 4 : 6;
  const gap = Space.md;
  const tileW = Math.floor((contentWidth - Space.lg * 2 - gap * (cols - 1)) / cols);

  const genreChips = (genres.data?.genres ?? []).filter((g) => !NON_DRAMA_GENRES.includes(g.id) && g.id !== 37 && g.id !== 10766);

  const header = (
    <View style={styles.header}>
      {Platform.OS === 'web' ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search K-dramas"
          placeholderTextColor={c.muted}
          accessibilityLabel="Search K-dramas"
          style={[styles.webSearch, { color: c.ink, backgroundColor: c.surface, borderColor: c.line, fontFamily: Fonts.sans }]}
        />
      ) : null}
      {!q ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Popular" selected={!genre} onPress={() => setGenre(undefined)} />
          {genreChips.map((g) => (
            <Chip key={g.id} label={g.name} selected={genre === g.id} onPress={() => setGenre(g.id)} />
          ))}
        </ScrollView>
      ) : (
        <T v="small" muted>
          {shows.isSuccess ? `${items.length}${shows.hasNextPage ? '+' : ''} K-dramas matching “${q}”` : `Searching for “${q}”…`}
        </T>
      )}
    </View>
  );

  const empty = shows.isPending ? (
    <Loading />
  ) : shows.isError ? (
    <Message title="Couldn’t load dramas" body={shows.error.message} action={{ label: 'Try again', onPress: () => shows.refetch() }} />
  ) : (
    <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.xl }}>
      <T muted>{q ? `No K-dramas match “${q}”. Try the English or Korean title.` : 'Nothing here yet.'}</T>
    </View>
  );

  const body = !hasToken() ? (
    <Message title="TMDB isn’t connected" body="Add EXPO_PUBLIC_TMDB_READ_TOKEN to .env.local and restart the dev server. See the README." />
  ) : (
    <FlatList
      key={cols}
      data={items}
      numColumns={cols}
      keyExtractor={(s) => String(s.id)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      columnWrapperStyle={{ gap, paddingHorizontal: Space.lg }}
      contentContainerStyle={[styles.list, { width: contentWidth }]}
      style={{ alignSelf: 'center', width: '100%', maxWidth: contentWidth }}
      renderItem={({ item }) => <Tile show={item} width={tileW} />}
      onEndReachedThreshold={0.6}
      onEndReached={() => shows.hasNextPage && !shows.isFetchingNextPage && shows.fetchNextPage()}
      refreshControl={<RefreshControl refreshing={shows.isRefetching && !shows.isFetchingNextPage && !shows.isPlaceholderData} onRefresh={() => void shows.refetch()} tintColor={c.muted} />}
      ListEmptyComponent={<View style={{ minHeight: 320 }}>{empty}</View>}
      ListFooterComponent={shows.isFetchingNextPage ? <ActivityIndicator style={{ margin: Space.xl }} color={c.jade} /> : undefined}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: 'Search K-dramas',
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery(''),
            hideWhenScrolling: false,
            tintColor: c.jade,
          },
        }}
      />
      {body}
    </View>
  );
}

function Tile({ show, width }: { show: ShowSummary; width: number }) {
  return (
    <Link href={{ pathname: '/drama/[id]', params: { id: String(show.id) } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${show.name}${yearOf(show.first_air_date) ? `, ${yearOf(show.first_air_date)}` : ''}`}
        style={({ pressed }) => [{ width, marginBottom: Space.lg, opacity: pressed ? 0.75 : 1 }]}>
        <Poster path={show.poster_path} title={show.name} width={width} />
        <T v="small" numberOfLines={2} style={{ marginTop: 6 }}>
          {show.name}
        </T>
        <T v="small" muted>
          {yearOf(show.first_air_date)}
        </T>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { alignSelf: 'center', paddingBottom: Space.xxl },
  header: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.lg, gap: Space.md },
  chips: { gap: Space.sm, paddingRight: Space.lg },
  webSearch: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 10, fontSize: 16 },
});
