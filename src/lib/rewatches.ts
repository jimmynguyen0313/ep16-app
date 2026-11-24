import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { todayISO } from '@/lib/dates';
import { normalizeRating } from '@/lib/diary';
import { supabase } from '@/lib/supabase';

/** A row in public.rewatches: watching a drama again after its first time. */
export type Rewatch = {
  id: number;
  user_id: string;
  show_id: number;
  watched_on: string;
  rating: number | null;
  note: string;
  created_at: string;
};

export type RewatchForm = { watchedOn: string; rating: number | null; note: string };

export const emptyRewatch = (): RewatchForm => ({ watchedOn: todayISO(), rating: null, note: '' });

export const formFromRewatch = (r: Rewatch): RewatchForm => ({
  watchedOn: r.watched_on,
  rating: r.rating,
  note: r.note,
});

export function rewatchRow(form: RewatchForm) {
  return {
    watched_on: form.watchedOn || todayISO(),
    rating: normalizeRating(form.rating),
    note: form.note.trim().slice(0, 2000),
  };
}

/** How many times each drama was rewatched. */
export function rewatchCounts(rewatches: Rewatch[]) {
  const counts = new Map<number, number>();
  for (const r of rewatches) counts.set(r.show_id, (counts.get(r.show_id) ?? 0) + 1);
  return counts;
}

/* ---------- hooks ---------- */

/** Every rewatch the signed-in person logged, newest first. One request covers the whole app. */
export function useRewatches() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['diary', userId, 'rewatches'],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewatches')
        .select('*')
        .order('watched_on', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      return (data as Rewatch[]).map((r) => ({ ...r, rating: r.rating == null ? null : Number(r.rating) }));
    },
  });
}

export function useShowRewatches(showId: number) {
  const q = useRewatches();
  return { ...q, rewatches: (q.data ?? []).filter((r) => r.show_id === showId) };
}

export function useSaveRewatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ showId, id, form }: { showId: number; id?: number; form: RewatchForm }) => {
      const row = rewatchRow(form);
      const { error } = id
        ? await supabase.from('rewatches').update(row).eq('id', id)
        : await supabase.from('rewatches').insert({ ...row, show_id: showId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary'] }),
  });
}

export function useDeleteRewatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('rewatches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary'] }),
  });
}
