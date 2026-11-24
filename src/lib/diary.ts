import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { todayISO } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { ShowDetail } from '@/lib/tmdb';

export type Status = 'watched' | 'watching' | 'want';

export const STATUS_LABEL: Record<Status, string> = {
  watched: 'Watched',
  watching: 'Watching',
  want: 'Want to watch',
};

/** A row in public.diary_entries (see supabase/migrations). */
export type DiaryEntry = {
  user_id: string;
  show_id: number;
  title: string;
  poster_path: string | null;
  first_air_date: string | null;
  genre_ids: number[];
  total_episodes: number | null;
  status: Status;
  rating: number | null;
  note: string;
  logged_on: string;
  episodes_watched: number;
  created_at: string;
  updated_at: string;
};

/** What the log sheet edits. */
export type EntryForm = {
  status: Status;
  rating: number | null;
  note: string;
  episodesWatched: number;
  loggedOn: string;
};

export { todayISO };

/** What logged_on means for each status. */
export const DATE_LABEL: Record<Status, string> = {
  watched: 'Finished on',
  watching: 'Started on',
  want: 'Added on',
};

export function formFromEntry(entry: DiaryEntry | undefined): EntryForm {
  return entry
    ? {
        status: entry.status,
        rating: entry.rating,
        note: entry.note,
        episodesWatched: entry.episodes_watched,
        loggedOn: entry.logged_on,
      }
    : { status: 'watched', rating: null, note: '', episodesWatched: 0, loggedOn: todayISO() };
}

/** Round to the nearest half star and clamp to 0.5–5; anything below 0.5 means "no rating". */
export function normalizeRating(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const half = Math.round(value * 2) / 2;
  return half < 0.5 ? null : Math.min(5, half);
}

/** Build the row to save: the person's log plus a copy of the drama's basics from TMDB. */
export function toRow(userId: string, show: ShowDetail, form: EntryForm) {
  const total = show.number_of_episodes && show.number_of_episodes > 0 ? show.number_of_episodes : null;
  const watching = form.status === 'watching';
  const episodes = form.status === 'watched' && total ? total : watching ? Math.max(0, form.episodesWatched) : 0;
  return {
    user_id: userId,
    show_id: show.id,
    title: show.name,
    poster_path: show.poster_path,
    first_air_date: show.first_air_date || null,
    genre_ids: show.genres.map((g) => g.id),
    total_episodes: total,
    status: form.status,
    rating: form.status === 'want' ? null : normalizeRating(form.rating),
    note: form.note.trim().slice(0, 5000),
    logged_on: form.loggedOn || todayISO(),
    episodes_watched: total ? Math.min(episodes, total) : episodes,
  };
}

export function diaryStats(entries: DiaryEntry[]) {
  const rated = entries.filter((e) => e.rating != null);
  return {
    watched: entries.filter((e) => e.status === 'watched').length,
    watching: entries.filter((e) => e.status === 'watching').length,
    want: entries.filter((e) => e.status === 'want').length,
    average: rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null,
  };
}

/* ---------- hooks ---------- */

export function useDiary() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['diary', userId, 'entries'],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      // numeric columns arrive as strings or numbers depending on the client; make them numbers
      return (data as DiaryEntry[]).map((e) => ({ ...e, rating: e.rating == null ? null : Number(e.rating) }));
    },
  });
}

export function useEntry(showId: number) {
  const diary = useDiary();
  return { ...diary, entry: diary.data?.find((e) => e.show_id === showId) };
}

export function useSaveEntry() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ show, form }: { show: ShowDetail; form: EntryForm }) => {
      if (!session) throw new Error('Sign in to save to your diary.');
      const { error } = await supabase
        .from('diary_entries')
        .upsert(toRow(session.user.id, show, form), { onConflict: 'user_id,show_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary'] }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (showId: number) => {
      const { error } = await supabase.from('diary_entries').delete().eq('show_id', showId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary'] }),
  });
}
