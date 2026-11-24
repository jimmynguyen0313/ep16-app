import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/** A row in public.favorite_actors. */
export type FavoriteActor = {
  user_id: string;
  person_id: number;
  name: string;
  profile_path: string | null;
  created_at: string;
};

type Actor = { id: number; name: string; profile_path: string | null };

function useKey() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return { userId, key: ['diary', userId, 'favorites'] as const };
}

/** The signed-in person's favorite actors, most recently added first. */
export function useFavorites() {
  const { userId, key } = useKey();
  return useQuery({
    queryKey: key,
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_actors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FavoriteActor[];
    },
  });
}

/** Add or remove an actor. The heart updates straight away and rolls back if saving fails. */
export function useToggleFavorite() {
  const { userId, key } = useKey();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ actor, favorite }: { actor: Actor; favorite: boolean }) => {
      const { error } = favorite
        ? await supabase
            .from('favorite_actors')
            .upsert(
              { person_id: actor.id, name: actor.name, profile_path: actor.profile_path },
              { onConflict: 'user_id,person_id' },
            )
        : await supabase.from('favorite_actors').delete().eq('person_id', actor.id);
      if (error) throw error;
    },
    onMutate: async ({ actor, favorite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FavoriteActor[]>(key);
      qc.setQueryData<FavoriteActor[]>(key, (list = []) =>
        favorite
          ? [
              {
                user_id: userId ?? '',
                person_id: actor.id,
                name: actor.name,
                profile_path: actor.profile_path,
                created_at: new Date().toISOString(),
              },
              ...list.filter((f) => f.person_id !== actor.id),
            ]
          : list.filter((f) => f.person_id !== actor.id),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
