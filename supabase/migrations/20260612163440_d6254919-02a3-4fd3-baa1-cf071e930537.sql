ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS night_shift_start time NOT NULL DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS night_shift_end time NOT NULL DEFAULT '05:00',
  ADD COLUMN IF NOT EXISTS night_premium_percent numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS overtime_premium_percent numeric NOT NULL DEFAULT 50;