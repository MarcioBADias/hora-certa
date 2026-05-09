import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DayClassification = 'overtime' | 'day_off';

export interface DayOverride {
  id: string;
  user_id: string;
  date: string;
  classification: DayClassification;
}

export function useDayOverrides(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['day-overrides', user?.id, startDate, endDate],
    queryFn: async (): Promise<DayOverride[]> => {
      if (!user) return [];
      let q = (supabase as any).from('day_overrides').select('*').eq('user_id', user.id);
      if (startDate) q = q.gte('date', startDate);
      if (endDate) q = q.lte('date', endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data as DayOverride[]) || [];
    },
    enabled: !!user,
  });

  const overridesByDate: Record<string, DayClassification> = {};
  for (const o of query.data || []) overridesByDate[o.date] = o.classification;

  const setOverride = useMutation({
    mutationFn: async ({ date, classification }: { date: string; classification: DayClassification }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any).from('day_overrides').upsert(
        { user_id: user.id, date, classification },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['bank-credits'] });
    },
  });

  const removeOverride = useMutation({
    mutationFn: async (date: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any).from('day_overrides').delete().eq('user_id', user.id).eq('date', date);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['bank-credits'] });
    },
  });

  return {
    overrides: query.data || [],
    overridesByDate,
    isLoading: query.isLoading,
    setOverride,
    removeOverride,
  };
}
