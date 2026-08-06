DROP TRIGGER IF EXISTS trainer_bookings_member_update_guard ON public.trainer_bookings;

CREATE OR REPLACE FUNCTION public.enforce_member_booking_cancel_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'You can only cancel a booking, not change its status.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.session_date IS DISTINCT FROM OLD.session_date
     OR NEW.time_slot IS DISTINCT FROM OLD.time_slot
     OR NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
    RAISE EXCEPTION 'You can only cancel a booking; other details cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_member_booking_cancel_only() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trainer_bookings_member_update_guard
  BEFORE UPDATE ON public.trainer_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_booking_cancel_only();