import { describe, expect, it } from '@jest/globals';

import {
  genreNames,
  imageUrl,
  isKdrama,
  kdramaCredits,
  placeholderColor,
  topCast,
  yearOf,
  type AggregateCastMember,
  type TvCredit,
} from './tmdb';

const credit = (over: Partial<TvCredit>): TvCredit => ({
  id: 1,
  name: 'Show',
  original_name: '쇼',
  original_language: 'ko',
  poster_path: null,
  backdrop_path: null,
  first_air_date: '2020-01-01',
  genre_ids: [18],
  overview: '',
  vote_average: 8,
  character: 'Lead',
  credit_id: 'c',
  ...over,
});

describe('isKdrama', () => {
  it('keeps Korean scripted shows', () => {
    expect(isKdrama({ original_language: 'ko', genre_ids: [18, 35] })).toBe(true);
  });
  it('drops other languages and unscripted genres', () => {
    expect(isKdrama({ original_language: 'ja', genre_ids: [18] })).toBe(false);
    expect(isKdrama({ original_language: 'ko', genre_ids: [10764] })).toBe(false); // reality
    expect(isKdrama({ original_language: 'ko', genre_ids: [10767] })).toBe(false); // talk
  });
});

describe('kdramaCredits', () => {
  it('filters, dedupes by show and sorts newest first with undated last', () => {
    const out = kdramaCredits([
      credit({ id: 1, first_air_date: '2016-12-02', character: 'Goblin' }),
      credit({ id: 2, first_air_date: '2023-06-01' }),
      credit({ id: 1, first_air_date: '2016-12-02', character: 'Cameo' }),
      credit({ id: 3, first_air_date: '' }),
      credit({ id: 4, original_language: 'en' }),
      credit({ id: 5, genre_ids: [10767] }),
    ]);
    expect(out.map((c) => c.id)).toEqual([2, 1, 3]);
    expect(out.find((c) => c.id === 1)?.character).toBe('Goblin');
  });
});

describe('topCast', () => {
  const m = (id: number, order: number, roles: [string, number][]): AggregateCastMember => ({
    id,
    name: `Actor ${id}`,
    profile_path: null,
    order,
    total_episode_count: roles.reduce((s, r) => s + r[1], 0),
    roles: roles.map(([character, episode_count]) => ({ character, episode_count })),
  });
  it('orders by billing and picks the main role', () => {
    const out = topCast(
      [
        m(2, 1, [['Friend', 16]]),
        m(1, 0, [
          ['Young Ri', 2],
          ['Ri Jeong-hyeok', 16],
        ]),
      ],
      5,
    );
    expect(out.map((c) => c.id)).toEqual([1, 2]);
    expect(out[0].character).toBe('Ri Jeong-hyeok');
    expect(out[0].episodes).toBe(18);
  });
  it('handles missing credits', () => {
    expect(topCast(undefined)).toEqual([]);
  });
});

describe('small helpers', () => {
  it('yearOf', () => {
    expect(yearOf('2019-12-14')).toBe('2019');
    expect(yearOf('')).toBe('');
    expect(yearOf(null)).toBe('');
  });
  it('imageUrl', () => {
    expect(imageUrl('/a.jpg', 'w185')).toBe('https://image.tmdb.org/t/p/w185/a.jpg');
    expect(imageUrl(null)).toBeNull();
  });
  it('placeholderColor is stable', () => {
    expect(placeholderColor('Goblin')).toBe(placeholderColor('Goblin'));
  });
  it('genreNames skips unknown ids', () => {
    expect(genreNames([18, 999], [{ id: 18, name: 'Drama' }])).toEqual(['Drama']);
  });
});
