/**
 * TMDB (The Movie Database) client for K-dramas.
 *
 * Uses a v4 "API Read Access Token" from EXPO_PUBLIC_TMDB_READ_TOKEN. Expo inlines
 * EXPO_PUBLIC_* values into the app bundle, so this token ships with the app. That is
 * how TMDB's free tier is commonly used in client apps; a server proxy can hide it later.
 */

export const TMDB_API = 'https://api.themoviedb.org/3';
export const TMDB_IMAGES = 'https://image.tmdb.org/t/p';
const TOKEN = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN ?? '';

/** TV genres that aren't scripted dramas: Documentary, Kids, News, Reality, Talk. Animation too. */
export const NON_DRAMA_GENRES = [99, 10762, 10763, 10764, 10767, 16];

export type Genre = { id: number; name: string };

export type ShowSummary = {
  id: number;
  name: string;
  original_name: string;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  genre_ids: number[];
  overview: string;
  vote_average: number;
};

export type Paged<T> = { page: number; total_pages: number; total_results: number; results: T[] };

export type AggregateCastMember = {
  id: number;
  name: string;
  profile_path: string | null;
  order: number;
  total_episode_count: number;
  roles: { character: string; episode_count: number }[];
};

export type ShowDetail = Omit<ShowSummary, 'genre_ids'> & {
  genres: Genre[];
  networks: { id: number; name: string }[];
  number_of_episodes: number | null;
  number_of_seasons: number | null;
  episode_run_time: number[];
  status: string;
  tagline: string;
  aggregate_credits?: { cast: AggregateCastMember[] };
};

export type TvCredit = ShowSummary & { character: string; episode_count?: number; credit_id: string };

export type Person = {
  id: number;
  name: string;
  also_known_as: string[];
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  tv_credits?: { cast: TvCredit[] };
};

export class TmdbError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'TmdbError';
  }
}

export const hasToken = () => TOKEN.length > 0;

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  if (!hasToken()) throw new TmdbError('No TMDB token configured.', 0);
  const qs = new URLSearchParams({ language: 'en-US' });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const res = await fetch(`${TMDB_API}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const msg =
      res.status === 401
        ? 'TMDB rejected the access token.'
        : res.status === 404
          ? 'That title or person isn’t on TMDB.'
          : res.status === 429
            ? 'TMDB is rate limiting requests. Try again in a moment.'
            : `TMDB request failed (${res.status}).`;
    throw new TmdbError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

/* ---------- endpoints ---------- */

export function discoverKdramas(page: number, genreId?: number) {
  return get<Paged<ShowSummary>>('/discover/tv', {
    page,
    with_original_language: 'ko',
    sort_by: 'popularity.desc',
    without_genres: NON_DRAMA_GENRES.join(','),
    with_genres: genreId,
    'vote_count.gte': 20,
  });
}

/** TMDB search can't filter by language, so filter the page here. */
export async function searchKdramas(query: string, page: number) {
  const data = await get<Paged<ShowSummary>>('/search/tv', { query, page, include_adult: 'false' });
  return { ...data, results: data.results.filter(isKdrama) };
}

export function tvGenres() {
  return get<{ genres: Genre[] }>('/genre/tv/list');
}

export function showDetail(id: number) {
  return get<ShowDetail>(`/tv/${id}`, { append_to_response: 'aggregate_credits' });
}

export function person(id: number) {
  return get<Person>(`/person/${id}`, { append_to_response: 'tv_credits' });
}

/* ---------- pure helpers ---------- */

export function isKdrama(s: Pick<ShowSummary, 'original_language' | 'genre_ids'>) {
  return s.original_language === 'ko' && !s.genre_ids.some((g) => NON_DRAMA_GENRES.includes(g));
}

/** An actor's K-drama credits: one entry per show (first role listed), newest first, undated last. */
export function kdramaCredits(credits: TvCredit[]): TvCredit[] {
  const seen = new Map<number, TvCredit>();
  for (const c of credits) {
    if (!isKdrama(c)) continue;
    if (!seen.has(c.id)) seen.set(c.id, c);
  }
  return [...seen.values()].sort((a, b) => {
    if (!a.first_air_date) return 1;
    if (!b.first_air_date) return -1;
    return b.first_air_date.localeCompare(a.first_air_date);
  });
}

export type CastCard = { id: number; name: string; profile_path: string | null; character: string; episodes: number };

/** Billing order, deduped, with the role the actor played in the most episodes. */
export function topCast(cast: AggregateCastMember[] | undefined, limit = 15): CastCard[] {
  if (!cast) return [];
  return [...cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, limit)
    .map((m) => {
      const role = [...m.roles].sort((a, b) => b.episode_count - a.episode_count)[0];
      return {
        id: m.id,
        name: m.name,
        profile_path: m.profile_path,
        character: role?.character ?? '',
        episodes: m.total_episode_count,
      };
    });
}

export const yearOf = (date?: string | null) => (date && /^\d{4}/.test(date) ? date.slice(0, 4) : '');

export function imageUrl(
  path: string | null | undefined,
  size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'h632' = 'w342',
) {
  return path ? `${TMDB_IMAGES}/${size}${path}` : null;
}

/** Stable color per title for poster placeholders. */
export function placeholderColor(seed: string) {
  const palette = [
    '#B0455C',
    '#3E5876',
    '#5A4892',
    '#784A30',
    '#2C7769',
    '#5A8549',
    '#A13A27',
    '#2C78B1',
    '#863B57',
    '#4E5E6C',
  ];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export function genreNames(ids: number[], genres: Genre[] | undefined) {
  if (!genres) return [];
  const byId = new Map(genres.map((g) => [g.id, g.name] as const));
  return ids.map((id) => byId.get(id)).filter((n): n is string => !!n);
}
