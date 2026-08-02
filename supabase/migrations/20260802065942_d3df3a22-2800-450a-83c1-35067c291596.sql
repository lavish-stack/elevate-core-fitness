-- Break recursion first: user_roles select is self-scoped only
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- has_role no longer needs elevated privileges: it only self-checks and
-- user_roles RLS already exposes the caller's own rows.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;