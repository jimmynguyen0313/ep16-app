import { describe, expect, it, jest } from '@jest/globals';

import { diaryStats, formFromEntry, normalizeRating, toRow, type DiaryEntry, type EntryForm } from './diary';
import type { ShowDetail } from './tmdb';

// jest hoists these above the imports, so diary.ts never loads the real Supabase client.
jest.mock('@/lib/supabase', () => ({ supabase: {}, hasSupabase: () => false }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ session: null }) }));

const show = (over: Partial<ShowDetail> = {}): ShowDetail => ({
  id: 94796,
  name: 'Crash Landing on You',
  original_name: '사랑의 불시착',
  original_language: 'ko',
  poster_path: '/p.jpg',
  backdrop_path: null,
  first_air_date: '2019-12-14',
  overview: '',
  vote_average: 8.6,
  genres: [
    { id: 35, name: 'Comedy' },
    { id: 18, name: 'Drama' },
  ],
  networks: [],
  number_of_episodes: 16,
  number_of_seasons: 1,
  episode_run_time: [],
  status: 'Ended',
  tagline: '',
  ...over,
});

const form = (over: Partial<EntryForm> = {}): EntryForm => ({
  status: 'watched',
  rating: 4.5,
  note: '  loved it  ',
  episodesWatched: 0,
  loggedOn: '2026-11-23',
  ...over,
});

describe('normalizeRating', () => {
  it('rounds to half stars and clamps', () => {
    expect(normalizeRating(4.3)).toBe(4.5);
    expect(normalizeRating(4.2)).toBe(4);
    expect(normalizeRating(7)).toBe(5);
  });
  it('treats empty or tiny values as no rating', () => {
    expect(normalizeRating(null)).toBeNull();
    expect(normalizeRating(0.2)).toBeNull();
    expect(normalizeRating(Number.NaN)).toBeNull();
  });
});

describe('toRow', () => {
  it('copies the drama basics and trims the note', () => {
    const row = toRow('u1', show(), form());
    expect(row).toMatchObject({
      user_id: 'u1',
      show_id: 94796,
      title: 'Crash Landing on You',
      genre_ids: [35, 18],
      total_episodes: 16,
      rating: 4.5,
      note: 'loved it',
      first_air_date: '2019-12-14',
    });
  });
  it('marks every episode watched when the status is Watched', () => {
    expect(toRow('u1', show(), form({ episodesWatched: 3 })).episodes_watched).toBe(16);
  });
  it('keeps progress for Watching, capped at the total', () => {
    expect(toRow('u1', show(), form({ status: 'watching', episodesWatched: 7 })).episodes_watched).toBe(7);
    expect(toRow('u1', show(), form({ status: 'watching', episodesWatched: 40 })).episodes_watched).toBe(16);
  });
  it('drops the rating and progress for Want to watch', () => {
    const row = toRow('u1', show(), form({ status: 'want', episodesWatched: 5 }));
    expect(row.rating).toBeNull();
    expect(row.episodes_watched).toBe(0);
  });
  it('handles TMDB shows without an episode count or air date', () => {
    const row = toRow(
      'u1',
      show({ number_of_episodes: null, first_air_date: '' }),
      form({ status: 'watching', episodesWatched: 4 }),
    );
    expect(row.total_episodes).toBeNull();
    expect(row.first_air_date).toBeNull();
    expect(row.episodes_watched).toBe(4);
  });
});

describe('formFromEntry and diaryStats', () => {
  const entry = (over: Partial<DiaryEntry>): DiaryEntry => ({
    user_id: 'u1',
    show_id: 1,
    title: 'X',
    poster_path: null,
    first_air_date: null,
    genre_ids: [],
    total_episodes: 16,
    status: 'watched',
    rating: 4,
    note: '',
    logged_on: '2026-01-01',
    episodes_watched: 16,
    created_at: '',
    updated_at: '',
    ...over,
  });
  it('starts new logs as Watched today with no rating', () => {
    expect(formFromEntry(undefined)).toMatchObject({ status: 'watched', rating: null, note: '' });
  });
  it('counts statuses and averages only rated entries', () => {
    const s = diaryStats([
      entry({ rating: 4 }),
      entry({ rating: 5 }),
      entry({ status: 'watching', rating: null }),
      entry({ status: 'want', rating: null }),
    ]);
    expect(s).toEqual({ watched: 2, watching: 1, want: 1, average: 4.5 });
  });
});
