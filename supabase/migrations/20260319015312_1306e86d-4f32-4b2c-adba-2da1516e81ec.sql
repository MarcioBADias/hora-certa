ALTER TABLE public.hour_bank DROP CONSTRAINT IF EXISTS hour_bank_type_check;
ALTER TABLE public.hour_bank ADD CONSTRAINT hour_bank_type_check CHECK (type IN ('credit', 'debit', 'paid_override'));