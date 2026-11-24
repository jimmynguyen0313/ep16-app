import { describe, expect, it, jest } from '@jest/globals';

import { rewatchCounts, rewatchRow, type Rewatch } from './rewatches';

jest.mock('@/lib/supabase', () => ({ supabase: {}, hasSupabase: () => false }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ session: null }) }));

describe('rewatches', () => {
  it('builds a row with a half-star rating and a trimmed note', () => {
    expect(rewatchRow({ watchedOn: '2026-11-20', rating: 3.7, note: '  still cried  ' })).toEqual({
      watched_on: '2026-11-20',
      rating: 3.5,
      note: 'still cried',
    });
  });
  it('counts rewatches per drama', () => {
    const r = (show_id: number) => ({ show_id }) as Rewatch;
    const counts = rewatchCounts([r(1), r(2), r(1)]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
    expect(counts.get(3)).toBeUndefined();
  });
});
