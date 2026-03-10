import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HourBankEntry {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  type: string;
  description: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useHourBank() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hour-bank', user?.id],
    queryFn: async (): Promise<HourBankEntry[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('hour_bank')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addBankEntry = useMutation({
    mutationFn: async (entry: Omit<HourBankEntry, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('hour_bank').insert({
        ...entry,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hour-bank'] }),
  });

  const deleteBankEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hour_bank').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hour-bank'] }),
  });

  // Calculate current balance (credits - debits, excluding expired)
  const balance = (query.data || []).reduce((acc, entry) => {
    const now = new Date();
    if (entry.type === 'credit' && entry.expires_at && new Date(entry.expires_at) < now) {
      return acc; // expired
    }
    return acc + (entry.type === 'credit' ? entry.hours : -entry.hours);
  }, 0);

  return { entries: query.data || [], isLoading: query.isLoading, addBankEntry, deleteBankEntry, balance };
}
