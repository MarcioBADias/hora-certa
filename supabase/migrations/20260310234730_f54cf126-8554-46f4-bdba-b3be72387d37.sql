
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weekly_hours NUMERIC NOT NULL DEFAULT 20,
  work_days JSONB NOT NULL DEFAULT '[{"day": 3, "hours": 7}, {"day": 4, "hours": 7}, {"day": 5, "hours": 6}]',
  opening_time TEXT NOT NULL DEFAULT '07:00',
  closing_time TEXT NOT NULL DEFAULT '21:00',
  max_daily_overtime NUMERIC NOT NULL DEFAULT 6,
  max_monthly_paid_overtime NUMERIC NOT NULL DEFAULT 44,
  bank_expiration_days INTEGER NOT NULL DEFAULT 90,
  break_threshold_hours NUMERIC NOT NULL DEFAULT 7,
  break_duration_hours NUMERIC NOT NULL DEFAULT 1,
  hourly_rate NUMERIC DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  entry_time TIME NOT NULL,
  exit_time TIME NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'work' CHECK (entry_type IN ('work', 'absence', 'day_off')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.time_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_time_entries_user_date ON public.time_entries(user_id, date);

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hour bank table
CREATE TABLE public.hour_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hour_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank" ON public.hour_bank FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank" ON public.hour_bank FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank" ON public.hour_bank FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank" ON public.hour_bank FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_hour_bank_user_date ON public.hour_bank(user_id, date);

CREATE TRIGGER update_hour_bank_updated_at BEFORE UPDATE ON public.hour_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
