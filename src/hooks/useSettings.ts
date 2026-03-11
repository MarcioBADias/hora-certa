import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseWorkDays, UserSettings, WorkDay } from '@/lib/calculations';
import { Json } from '@/integrations/supabase/types';

const DEFAULT_SETTINGS: UserSettings = {
  weekly_hours: 20,
  work_days: [{ day: 3, hours: 7 }, { day: 4, hours: 7 }, { day: 5, hours: 6 }],
  opening_time: '07:00',
  closing_time: '21:00',
  max_daily_overtime: 6,
  max_monthly_paid_overtime: 44,
  bank_expiration_days: 90,
  break_threshold_hours: 7,
  break_duration_hours: 1,
  hourly_rate: null,
};

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async (): Promise<UserSettings> => {
      if (!user) return DEFAULT_SETTINGS;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
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
