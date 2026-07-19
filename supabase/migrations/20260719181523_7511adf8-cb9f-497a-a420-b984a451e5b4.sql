ALTER EXTENSION pg_trgm SET SCHEMA extensions;

COMMENT ON FUNCTION public.join_group_by_invite(text) IS 'Intentional constrained security-definer RPC: lets signed-in users join a private group only when they know its invite code; rate-limited by group_invite_attempts and grants limited to authenticated users.';