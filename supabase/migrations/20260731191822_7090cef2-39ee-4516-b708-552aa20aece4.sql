DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['trainers','gallery_images','testimonials','programs','faqs','membership_plans'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read active %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read active %1$s" ON public.%1$I FOR SELECT USING (is_active = true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins read all %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins read all %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;