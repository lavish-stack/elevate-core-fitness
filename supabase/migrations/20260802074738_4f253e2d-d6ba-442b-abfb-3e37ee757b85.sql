DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('on_membership_request_change','on_booking_change','on_contact_message_change',
                        'on_trial_registration','on_membership_change','push_notification',
                        'handle_new_user','grant_bootstrap_admin','set_updated_at')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f.sig);
  END LOOP;
END $$;