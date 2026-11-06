-- Fix "infinite recursion detected in policy for relation room_members".
-- The room_members SELECT policy queried room_members, which re-applied the
-- same policy. Every read of the table, and every policy that joins it
-- (profiles, study_goals, study_sessions), failed with SQLSTATE 42P17.
-- The membership check now runs in a SECURITY DEFINER helper, which reads
-- the table without re-entering the policy. The helper lives in a schema
-- PostgREST does not expose, so it is not callable as an RPC.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_room_member(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members rm
    WHERE rm.room_id = p_room_id
      AND rm.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_room_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_room_member(UUID) TO authenticated;

DROP POLICY IF EXISTS "room_members_select_members" ON public.room_members;
CREATE POLICY "room_members_select_members" ON public.room_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_room_member(room_id))
  );
