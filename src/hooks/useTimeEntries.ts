import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TimeEntry {
  id: string;
  user_id: string;
  date: string;
  entry_time: string;
  exit_time: string;
  entry_type: string;
  notes: string | null;
}

export function useTimeEntries(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['time-entries', user?.id, startDate, endDate],
    queryFn: async (): Promise<TimeEntry[]> => {
      if (!user) return [];
      let q = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('entry_time', { ascending: true });
      
      if (startDate) q = q.gte('date', startDate);
      if (endDate) q = q.lte('date', endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Omit<TimeEntry, 'id' | 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('time_entries').insert({
        ...entry,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<TimeEntry> & { id: string }) => {
      const { error } = await supabase.from('time_entries').update(entry).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  });

  return { entries: query.data || [], isLoading: query.isLoading, addEntry, updateEntry, deleteEntry };
}
