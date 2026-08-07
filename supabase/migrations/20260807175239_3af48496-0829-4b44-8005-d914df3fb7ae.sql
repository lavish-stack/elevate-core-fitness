ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_open_attempt_per_plan
  ON public.payments (user_id, plan_id)
  WHERE status = 'created';

CREATE INDEX IF NOT EXISTS payments_user_created_at_idx
  ON public.payments (user_id, created_at DESC);