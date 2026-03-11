
CREATE TABLE public.clock_punches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  punch_number INTEGER NOT NULL CHECK (punch_number BETWEEN 1 AND 4),
  punch_time TIME WITHOUT TIME ZONE NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, punch_number)
);

ALTER TABLE public.clock_punches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own punches" ON public.clock_punches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own punches" ON public.clock_punches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own punches" ON public.clock_punches FOR DELETE USING (auth.uid() = user_id);
