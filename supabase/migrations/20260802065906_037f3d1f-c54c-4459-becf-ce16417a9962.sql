-- 1. Replace always-true INSERT policies with validated ones
DROP POLICY IF EXISTS "Anyone can send message" ON public.contact_messages;
CREATE POLICY "Anyone can send message"
ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(full_name)) BETWEEN 2 AND 100
  AND char_length(email) <= 254
  AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND (phone IS NULL OR phone ~ '^[0-9+()\s-]{6,20}$')
  AND (subject IS NULL OR char_length(subject) <= 200)
  AND char_length(btrim(message)) BETWEEN 5 AND 5000
  AND is_read = false
);

DROP POLICY IF EXISTS "Anyone can register for trial" ON public.trial_registrations;
CREATE POLICY "Anyone can register for trial"
ON public.trial_registrations FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(full_name)) BETWEEN 2 AND 100
  AND char_length(email) <= 254
  AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND phone ~ '^[0-9+()\s-]{6,20}$'
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 2. Trigger-only SECURITY DEFINER functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_bootstrap_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Storage: remove blanket public read of the private bucket (signed URLs still work)
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;
CREATE POLICY "Admins read site assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));