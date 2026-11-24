import type { DiaryEntry } from '@/lib/diary';
import type { Rewatch } from '@/lib/rewatches';
import type { AggregateCastMember } from '@/lib/tmdb';

const yearOfISO = (iso: string) => Number(iso.slice(0, 4));

/** Years with something to wrap: dramas finished or rewatched. Newest first. */
export function wrappedYears(entries: DiaryEntry[], rewatches: Rewatch[]) {
  const years = new Set<number>();
  for (const e of entries) if (e.status === 'watched') years.add(yearOfISO(e.logged_on));
  for (const r of rewatches) years.add(yearOfISO(r.watched_on));
  return [...years].sort((a, b) => b - a);
}

export type Wrapped = {
  year: number;
  /** Dramas finished this year, in the order they were finished. */
  finished: DiaryEntry[];
  rewatches: number;
  /** Episodes in dramas finished or rewatched this year (where TMDB knows the count). */
  episodes: number;
  average: number | null;
  topRated: DiaryEntry[];
  topGenres: { id: number; count: number }[];
  busiestMonth: { month: number; count: number } | null;
};

export function wrapYear(entries: DiaryEntry[], rewatches: Rewatch[], year: number): Wrapped {
  const finished = entries
    .filter((e) => e.status === 'watched' && yearOfISO(e.logged_on) === year)
    .sort((a, b) => a.logged_on.localeCompare(b.logged_on));
  const rewatched = rewatches.filter((r) => yearOfISO(r.watched_on) === year);
  const byShow = new Map(entries.map((e) => [e.show_id, e]));

  const episodes =
    finished.reduce((s, e) => s + (e.total_episodes ?? 0), 0) +
    rewatched.reduce((s, r) => s + (byShow.get(r.show_id)?.total_episodes ?? 0), 0);

  const rated = finished.filter((e) => e.rating != null);
  const average = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null;
  // Highest rating first; ties go to the one finished earlier in the year.
  const topRated = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);

  const genres = new Map<number, number>();
  for (const e of finished) for (const g of e.genre_ids) genres.set(g, (genres.get(g) ?? 0) + 1);
  const topGenres = [...genres]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, 3);

  const months = new Map<number, number>();
  for (const e of finished) {
    const m = Number(e.logged_on.slice(5, 7));
    months.set(m, (months.get(m) ?? 0) + 1);
  }
  let busiestMonth: Wrapped['busiestMonth'] = null;
  for (const [month, count] of months) {
    if (!busiestMonth || count > busiestMonth.count || (count === busiestMonth.count && month < busiestMonth.month))
      busiestMonth = { month, count };
  }

  return { year, finished, rewatches: rewatched.length, episodes, average, topRated, topGenres, busiestMonth };
}

export type ActorTally = { id: number; name: string; profile_path: string | null; dramas: number; episodes: number };

/**
 * Actors who appear in the most of the given dramas' main casts (top 12 billed),
 * counting only actors in at least two. Ties go to more episodes on screen.
 */
export function topActors(casts: AggregateCastMember[][], limit = 5): ActorTally[] {
  const tally = new Map<number, ActorTally>();
  for (const cast of casts) {
    const main = [...cast].sort((a, b) => a.order - b.order).slice(0, 12);
    for (const m of main) {
      const t = tally.get(m.id) ?? { id: m.id, name: m.name, profile_path: m.profile_path, dramas: 0, episodes: 0 };
      t.dramas += 1;
      t.episodes += m.total_episode_count;
      tally.set(m.id, t);
    }
  }
  return [...tally.values()]
    .filter((t) => t.dramas >= 2)
    .sort((a, b) => b.dramas - a.dramas || b.episodes - a.episodes)
    .slice(0, limit);
}
