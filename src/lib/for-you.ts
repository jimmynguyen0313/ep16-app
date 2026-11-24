import type { DiaryEntry } from '@/lib/diary';
import { isKdrama, type ShowSummary } from '@/lib/tmdb';

/** How many diary dramas to base suggestions on. Each one is a TMDB request. */
export const MAX_SEEDS = 5;

/**
 * The dramas to base suggestions on: the highest rated (4★ or more), newest first among ties.
 * With nothing rated that high yet, the most recently finished or started dramas stand in.
 */
export function pickSeeds(entries: DiaryEntry[]): DiaryEntry[] {
  const seen = entries.filter((e) => e.status !== 'want');
  const loved = seen
    .filter((e) => (e.rating ?? 0) >= 4)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.logged_on.localeCompare(a.logged_on));
  if (loved.length) return loved.slice(0, MAX_SEEDS);
  return [...seen].sort((a, b) => b.logged_on.localeCompare(a.logged_on)).slice(0, 3);
}

export type Suggestion = { show: ShowSummary; because: string; score: number };

/**
 * Merge TMDB's recommendations for each seed into one list. A drama recommended by several
 * seeds, near the top of their lists, from higher-rated seeds, ranks first. Dramas already in
 * the diary, non-K-dramas and ones with too few votes to trust are left out.
 */
export function rankSuggestions(
  lists: { seed: DiaryEntry; results: ShowSummary[] }[],
  inDiary: Set<number>,
  limit = 20,
): Suggestion[] {
  const byId = new Map<number, { show: ShowSummary; score: number; best: number; because: string }>();
  for (const { seed, results } of lists) {
    const weight = seed.rating ?? 3;
    results.forEach((show, rank) => {
      if (inDiary.has(show.id) || !isKdrama(show) || (show.vote_count ?? 0) < 20) return;
      const points = weight * (1 - rank / 40);
      const cur = byId.get(show.id) ?? { show, score: 0, best: 0, because: seed.title };
      cur.score += points;
      if (points > cur.best) {
        cur.best = points;
        cur.because = seed.title;
      }
      byId.set(show.id, cur);
    });
  }
  return [...byId.values()]
    .sort((a, b) => b.score - a.score || b.show.vote_average - a.show.vote_average)
    .slice(0, limit)
    .map(({ show, because, score }) => ({ show, because, score }));
}
