CREATE TABLE public.day_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('overtime','day_off')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.day_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own day overrides" ON public.day_overrides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own day overrides" ON public.day_overrides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own day overrides" ON public.day_overrides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own day overrides" ON public.day_overrides FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_day_overrides_updated_at
BEFORE UPDATE ON public.day_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();