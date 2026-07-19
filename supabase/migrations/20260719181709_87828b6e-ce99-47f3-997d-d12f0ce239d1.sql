REVOKE ALL ON FUNCTION public.join_group_by_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_group_by_invite(text) FROM anon;
REVOKE ALL ON FUNCTION public.join_group_by_invite(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite(text) TO service_role;