import { describe, expect, it } from '@jest/globals';

import type { DiaryEntry } from './diary';
import { pickSeeds, rankSuggestions } from './for-you';
import type { ShowSummary } from './tmdb';

const entry = (show_id: number, over: Partial<DiaryEntry> = {}) =>
  ({
    show_id,
    title: `Seed ${show_id}`,
    status: 'watched',
    rating: null,
    logged_on: '2026-01-01',
    ...over,
  }) as DiaryEntry;
const show = (id: number, over: Partial<ShowSummary> = {}) =>
  ({
    id,
    name: `Show ${id}`,
    original_language: 'ko',
    genre_ids: [18],
    vote_average: 7,
    vote_count: 100,
    ...over,
  }) as ShowSummary;

describe('pickSeeds', () => {
  it('uses dramas rated 4 stars or more, best first', () => {
    const seeds = pickSeeds([
      entry(1, { rating: 4 }),
      entry(2, { rating: 5 }),
      entry(3, { rating: 3.5 }),
      entry(4, { rating: 5, status: 'want' }),
    ]);
    expect(seeds.map((s) => s.show_id)).toEqual([2, 1]);
  });
  it('falls back to recent dramas when nothing is rated highly', () => {
    const seeds = pickSeeds([entry(1, { logged_on: '2026-01-01' }), entry(2, { logged_on: '2026-02-01' })]);
    expect(seeds.map((s) => s.show_id)).toEqual([2, 1]);
  });
});

describe('rankSuggestions', () => {
  const a = entry(1, { rating: 5, title: 'Loved' });
  const b = entry(2, { rating: 4, title: 'Liked' });
  it('ranks shows recommended by more seeds first and skips what you have', () => {
    const out = rankSuggestions(
      [
        { seed: a, results: [show(10), show(11), show(2)] },
        { seed: b, results: [show(11), show(12)] },
      ],
      new Set([1, 2]),
    );
    expect(out.map((s) => s.show.id)).toEqual([11, 10, 12]);
    expect(out[0].because).toBe('Loved');
    expect(out[2].because).toBe('Liked');
  });
  it('drops non-K-dramas and shows with few votes', () => {
    const out = rankSuggestions(
      [
        {
          seed: a,
          results: [
            show(20, { original_language: 'en' }),
            show(21, { vote_count: 3 }),
            show(22, { genre_ids: [10764] }),
          ],
        },
      ],
      new Set(),
    );
    expect(out).toEqual([]);
  });
});
