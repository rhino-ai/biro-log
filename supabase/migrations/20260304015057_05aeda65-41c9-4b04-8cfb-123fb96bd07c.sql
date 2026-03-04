CREATE OR REPLACE FUNCTION public.verify_admin_step_codes(_step_one text, _step_two text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND _step_one = '4918'
    AND _step_two = '555911'
  );
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_step_codes(text, text) TO authenticated;