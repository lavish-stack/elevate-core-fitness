-- ============ ENUMS ============
CREATE TYPE public.request_type AS ENUM ('renewal', 'cancellation', 'new');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'user',
  kind text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  dedupe_key text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_audience_check CHECK (audience IN ('user','admin')),
  CONSTRAINT notifications_target_check CHECK (audience = 'admin' OR user_id IS NOT NULL)
);

GRANT SELECT, UPDATE, DELETE, INSERT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING ((audience = 'user' AND user_id = auth.uid())
         OR (audience = 'admin' AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((audience = 'user' AND user_id = auth.uid())
         OR (audience = 'admin' AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK ((audience = 'user' AND user_id = auth.uid())
         OR (audience = 'admin' AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING ((audience = 'user' AND user_id = auth.uid())
         OR (audience = 'admin' AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX notifications_dedupe_idx ON public.notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_audience_created_idx ON public.notifications (audience, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE is_read = false;

-- helper used by triggers (security definer so public forms can raise admin alerts)
CREATE OR REPLACE FUNCTION public.push_notification(
  _user_id uuid, _audience text, _kind text, _title text, _body text, _link text DEFAULT NULL, _dedupe text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, audience, kind, title, body, link, dedupe_key)
  VALUES (_user_id, _audience, _kind, _title, _body, _link, _dedupe)
  ON CONFLICT DO NOTHING;
END; $$;

REVOKE ALL ON FUNCTION public.push_notification(uuid, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.push_notification(uuid, text, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.push_notification(uuid, text, text, text, text, text, text) FROM authenticated;

-- ============ MEMBERSHIP REQUESTS ============
CREATE TABLE public.membership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  type public.request_type NOT NULL DEFAULT 'renewal',
  status public.request_status NOT NULL DEFAULT 'pending',
  note text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_requests TO authenticated;
GRANT ALL ON public.membership_requests TO service_role;
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own requests" ON public.membership_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members create own requests" ON public.membership_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins update requests" ON public.membership_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete requests" ON public.membership_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER membership_requests_set_updated_at BEFORE UPDATE ON public.membership_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX membership_requests_user_idx ON public.membership_requests (user_id, created_at DESC);
CREATE INDEX membership_requests_status_idx ON public.membership_requests (status, created_at DESC);
CREATE INDEX membership_requests_membership_idx ON public.membership_requests (membership_id);
CREATE INDEX membership_requests_plan_idx ON public.membership_requests (plan_id);

CREATE OR REPLACE FUNCTION public.on_membership_request_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.push_notification(NULL, 'admin', 'membership_request',
      'New ' || NEW.type::text || ' request',
      'A member submitted a membership ' || NEW.type::text || ' request.', '/admin/requests', NULL);
  ELSIF NEW.status <> OLD.status THEN
    PERFORM public.push_notification(NEW.user_id, 'user', 'membership',
      'Membership ' || NEW.type::text || ' request ' || NEW.status::text,
      COALESCE(NEW.admin_note, 'Your request was ' || NEW.status::text || '.'), '/dashboard', NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER membership_requests_notify
  AFTER INSERT OR UPDATE ON public.membership_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_membership_request_change();

-- ============ TRAINER AVAILABILITY ============
CREATE TABLE public.trainer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  time_slot text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, weekday, time_slot)
);

GRANT SELECT ON public.trainer_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainer_availability TO authenticated;
GRANT ALL ON public.trainer_availability TO service_role;
ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active availability" ON public.trainer_availability
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage availability" ON public.trainer_availability
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trainer_availability_set_updated_at BEFORE UPDATE ON public.trainer_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX trainer_availability_trainer_idx ON public.trainer_availability (trainer_id, weekday);

-- seed availability for every existing trainer (Mon-Sat)
INSERT INTO public.trainer_availability (trainer_id, weekday, time_slot)
SELECT t.id, d.weekday, s.slot
FROM public.trainers t
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(weekday)
CROSS JOIN (VALUES ('06:00 AM'),('07:00 AM'),('08:00 AM'),('05:00 PM'),('06:00 PM'),('07:00 PM'),('08:00 PM')) AS s(slot)
ON CONFLICT DO NOTHING;

-- ============ BOOKINGS ============
ALTER TABLE public.trainer_bookings ADD COLUMN IF NOT EXISTS admin_note text;

CREATE UNIQUE INDEX trainer_bookings_slot_unique
  ON public.trainer_bookings (trainer_id, session_date, time_slot)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX trainer_bookings_user_idx ON public.trainer_bookings (user_id, session_date DESC);
CREATE INDEX trainer_bookings_trainer_date_idx ON public.trainer_bookings (trainer_id, session_date);
CREATE INDEX trainer_bookings_status_idx ON public.trainer_bookings (status, created_at DESC);

CREATE TRIGGER trainer_bookings_set_updated_at BEFORE UPDATE ON public.trainer_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.on_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_name text;
BEGIN
  SELECT name INTO t_name FROM public.trainers WHERE id = NEW.trainer_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.push_notification(NULL, 'admin', 'booking', 'New trainer booking',
      'A session was requested with ' || COALESCE(t_name,'a trainer') || ' on ' || NEW.session_date || ' at ' || NEW.time_slot || '.', '/admin/bookings', NULL);
    PERFORM public.push_notification(NEW.user_id, 'user', 'booking', 'Booking request sent',
      'Your session with ' || COALESCE(t_name,'a trainer') || ' on ' || NEW.session_date || ' at ' || NEW.time_slot || ' is awaiting approval.', '/bookings', NULL);
  ELSIF NEW.status <> OLD.status OR NEW.session_date <> OLD.session_date OR NEW.time_slot <> OLD.time_slot THEN
    PERFORM public.push_notification(NEW.user_id, 'user', 'booking',
      'Booking ' || NEW.status::text,
      'Your session with ' || COALESCE(t_name,'a trainer') || ' is now ' || NEW.status::text || ' for ' || NEW.session_date || ' at ' || NEW.time_slot || '.', '/bookings', NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trainer_bookings_notify
  AFTER INSERT OR UPDATE ON public.trainer_bookings
  FOR EACH ROW EXECUTE FUNCTION public.on_booking_change();

-- ============ CONTACT MESSAGES: link + reply ============
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

DROP POLICY IF EXISTS "Anyone can send message" ON public.contact_messages;
CREATE POLICY "Anyone can send message" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(btrim(full_name)) >= 2 AND char_length(btrim(full_name)) <= 100
    AND char_length(email) <= 254
    AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (phone IS NULL OR phone ~ '^[0-9+()\s-]{6,20}$')
    AND (subject IS NULL OR char_length(subject) <= 200)
    AND char_length(btrim(message)) >= 5 AND char_length(btrim(message)) <= 5000
    AND is_read = false
    AND admin_reply IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Members read own messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX contact_messages_created_idx ON public.contact_messages (created_at DESC);
CREATE INDEX contact_messages_unread_idx ON public.contact_messages (is_read, created_at DESC);
CREATE INDEX contact_messages_user_idx ON public.contact_messages (user_id);

CREATE OR REPLACE FUNCTION public.on_contact_message_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.push_notification(NULL, 'admin', 'contact', 'New contact enquiry',
      NEW.full_name || ' sent a message: ' || COALESCE(NEW.subject, left(NEW.message, 60)), '/admin/messages', NULL);
  ELSIF NEW.admin_reply IS NOT NULL AND COALESCE(OLD.admin_reply,'') <> NEW.admin_reply AND NEW.user_id IS NOT NULL THEN
    PERFORM public.push_notification(NEW.user_id, 'user', 'contact_reply', 'Reply to your enquiry',
      NEW.admin_reply, '/dashboard', NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER contact_messages_notify
  AFTER INSERT OR UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_contact_message_change();

-- ============ TRIAL REGISTRATIONS ============
CREATE INDEX trial_registrations_created_idx ON public.trial_registrations (created_at DESC);
CREATE INDEX trial_registrations_status_idx ON public.trial_registrations (status, created_at DESC);
CREATE INDEX trial_registrations_user_idx ON public.trial_registrations (user_id);

CREATE OR REPLACE FUNCTION public.on_trial_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.push_notification(NULL, 'admin', 'trial', 'New free-trial registration',
    NEW.full_name || ' registered for the free trial (' || NEW.phone || ').', '/admin/trials', NULL);
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.push_notification(NEW.user_id, 'user', 'trial', 'Free trial registered',
      'We received your free-trial registration. Our team will contact you shortly.', '/dashboard', NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trial_registrations_notify
  AFTER INSERT ON public.trial_registrations
  FOR EACH ROW EXECUTE FUNCTION public.on_trial_registration();

-- ============ MEMBERSHIPS ============
CREATE INDEX memberships_user_idx ON public.memberships (user_id, expires_at DESC);
CREATE INDEX memberships_status_idx ON public.memberships (status, expires_at);
CREATE INDEX memberships_plan_idx ON public.memberships (plan_id);
CREATE INDEX payments_user_idx ON public.payments (user_id, created_at DESC);
CREATE INDEX payments_membership_idx ON public.payments (membership_id);

CREATE OR REPLACE FUNCTION public.on_membership_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status <> OLD.status THEN
    PERFORM public.push_notification(NEW.user_id, 'user', 'membership',
      'Membership ' || NEW.status::text,
      NEW.plan_name || ' — valid until ' || NEW.expires_at || '.', '/dashboard', NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER memberships_notify
  AFTER INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.on_membership_change();

-- expiry reminders for the calling member (idempotent via dedupe_key)
CREATE OR REPLACE FUNCTION public.check_my_membership_expiry()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; r record;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  FOR r IN
    SELECT id, plan_name, expires_at FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
      AND expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
  LOOP
    PERFORM public.push_notification(auth.uid(), 'user', 'expiry',
      'Membership expiring soon',
      r.plan_name || ' expires on ' || r.expires_at || '. Request a renewal to stay active.',
      '/dashboard', 'expiry:' || r.id::text || ':' || r.expires_at::text);
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.check_my_membership_expiry() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_my_membership_expiry() FROM anon;
GRANT EXECUTE ON FUNCTION public.check_my_membership_expiry() TO authenticated;

-- ============ CONTENT TABLE INDEXES ============
CREATE INDEX trainers_active_sort_idx ON public.trainers (is_active, sort_order);
CREATE INDEX gallery_active_sort_idx ON public.gallery_images (is_active, sort_order);
CREATE INDEX testimonials_active_sort_idx ON public.testimonials (is_active, sort_order);
CREATE INDEX programs_active_sort_idx ON public.programs (is_active, sort_order);
CREATE INDEX faqs_active_sort_idx ON public.faqs (is_active, sort_order);
CREATE INDEX membership_plans_active_sort_idx ON public.membership_plans (is_active, sort_order);
CREATE INDEX user_roles_user_idx ON public.user_roles (user_id, role);