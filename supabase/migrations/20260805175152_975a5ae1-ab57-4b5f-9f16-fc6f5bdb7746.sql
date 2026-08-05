ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.trainer_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.membership_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_requests;