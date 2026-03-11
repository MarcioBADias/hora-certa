import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClockPunch {
  id: string;
  user_id: string;
  date: string;
  punch_number: number;
  punch_time: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
}

export function useClockPunches(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clock-punches', user?.id, startDate, endDate],
    queryFn: async (): Promise<ClockPunch[]> => {
      if (!user) return [];
      let q = supabase
        .from('clock_punches')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('punch_number', { ascending: true });

      if (startDate) q = q.gte('date', startDate);
      if (endDate) q = q.lte('date', endDate);

      const { data, error } = await q;
      if (error) throw error;
      return (data as ClockPunch[]) || [];
    },
    enabled: !!user,
  });

  const addPunch = useMutation({
    mutationFn: async (punch: { date: string; punch_number: number; punch_time: string; latitude?: number; longitude?: number; address?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('clock_punches').insert({
        ...punch,
        user_id: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clock-punches'] }),
  });

  const deletePunch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clock_punches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clock-punches'] }),
  });

  return { punches: query.data || [], isLoading: query.isLoading, addPunch, deletePunch };
}
