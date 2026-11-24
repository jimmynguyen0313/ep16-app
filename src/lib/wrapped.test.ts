import { describe, expect, it } from '@jest/globals';

import type { DiaryEntry } from './diary';
import type { Rewatch } from './rewatches';
import type { AggregateCastMember } from './tmdb';
import { topActors, wrappedYears, wrapYear } from './wrapped';

const entry = (show_id: number, over: Partial<DiaryEntry> = {}): DiaryEntry => ({
  user_id: 'u1',
  show_id,
  title: `Show ${show_id}`,
  poster_path: null,
  first_air_date: null,
  genre_ids: [18],
  total_episodes: 16,
  status: 'watched',
  rating: null,
  note: '',
  logged_on: '2026-03-01',
  episodes_watched: 16,
  created_at: '',
  updated_at: '',
  ...over,
});
const rewatch = (show_id: number, watched_on: string) => ({ id: show_id, show_id, watched_on }) as Rewatch;

describe('wrapYear', () => {
  const entries = [
    entry(1, { logged_on: '2026-01-10', rating: 4, genre_ids: [18, 10749] }),
    entry(2, { logged_on: '2026-03-05', rating: 5, genre_ids: [18, 35], total_episodes: 12 }),
    entry(3, { logged_on: '2026-03-20', rating: 4.5, genre_ids: [35] }),
    entry(4, { logged_on: '2025-12-31', rating: 5 }),
    entry(5, { status: 'watching', logged_on: '2026-04-01' }),
    entry(6, { status: 'want', logged_on: '2026-04-02' }),
  ];
  const w = wrapYear(entries, [rewatch(4, '2026-06-01'), rewatch(1, '2025-05-01')], 2026);

  it('counts only dramas finished that year', () => {
    expect(w.finished.map((e) => e.show_id)).toEqual([1, 2, 3]);
  });
  it('adds rewatched episodes to the total', () => {
    expect(w.rewatches).toBe(1);
    expect(w.episodes).toBe(16 + 12 + 16 + 16);
  });
  it('ranks ratings, genres and the busiest month', () => {
    expect(w.average).toBe(4.5);
    expect(w.topRated.map((e) => e.show_id)).toEqual([2, 3, 1]);
    expect(w.topGenres).toEqual([
      { id: 18, count: 2 },
      { id: 35, count: 2 },
      { id: 10749, count: 1 },
    ]);
    expect(w.busiestMonth).toEqual({ month: 3, count: 2 });
  });
  it('handles an empty year', () => {
    const empty = wrapYear(entries, [], 2024);
    expect(empty).toMatchObject({ finished: [], episodes: 0, average: null, busiestMonth: null });
  });
  it('lists years with finished dramas or rewatches', () => {
    expect(wrappedYears(entries, [rewatch(1, '2024-02-02')])).toEqual([2026, 2025, 2024]);
  });
});

describe('topActors', () => {
  const m = (id: number, order: number, eps = 16) =>
    ({ id, name: `A${id}`, profile_path: null, order, total_episode_count: eps, roles: [] }) as AggregateCastMember;
  it('keeps actors in two or more dramas, most dramas first', () => {
    const casts = [
      [m(1, 0), m(2, 1), m(3, 2)],
      [m(1, 0), m(3, 5, 4)],
      [m(1, 3), m(2, 0, 20)],
    ];
    expect(topActors(casts).map((a) => [a.id, a.dramas])).toEqual([
      [1, 3],
      [2, 2],
      [3, 2],
    ]);
  });
  it('ignores actors billed outside the main cast', () => {
    const deep = Array.from({ length: 13 }, (_, i) => m(100 + i, i));
    expect(topActors([deep, deep]).some((a) => a.id === 112)).toBe(false);
  });
});
