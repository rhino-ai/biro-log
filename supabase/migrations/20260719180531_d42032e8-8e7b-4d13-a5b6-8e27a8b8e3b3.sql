
REVOKE ALL ON FUNCTION public.join_group_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite(text) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_group_invite_code() FROM PUBLIC, anon, authenticated;
