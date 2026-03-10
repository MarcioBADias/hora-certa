import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseWorkDays, UserSettings, WorkDay } from '@/lib/calculations';
import { Json } from '@/integrations/supabase/types';

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async (): Promise<UserSettings | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        work_days: parseWorkDays(data.work_days),
      };
    },
    enabled: !!user,
  });

  const saveSettings = useMutation({
    mutationFn: async (settings: Partial<UserSettings> & { work_days?: WorkDay[] }) => {
      if (!user) throw new Error('Not authenticated');
      const payload = {
        ...settings,
        user_id: user.id,
        work_days: settings.work_days ? (settings.work_days as unknown as Json) : undefined,
      };
      
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  return { settings: query.data, isLoading: query.isLoading, saveSettings };
}
