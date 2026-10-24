-- Convert all client-callable social RPCs from SECURITY DEFINER to SECURITY INVOKER.
-- Adopts declarative Row Level Security (RLS) instead of elevated superuser privileges.
-- Consolidates permissive policies to avoid multiple_permissive_policies performance warnings.
-- Resolves all 'Signed-In Users Can Execute SECURITY DEFINER' warnings in Supabase Security Advisor.

-- ============================================================================
-- 1. Profiles: Consolidated SELECT Policy
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_public_or_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_room_members" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    is_public
    OR (SELECT auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.room_members rm_target
      JOIN public.room_members rm_caller ON rm_caller.room_id = rm_target.room_id
      WHERE rm_target.user_id = profiles.id
        AND rm_caller.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 2. Study Goals: Consolidated Policies
-- ============================================================================

DROP POLICY IF EXISTS "study_goals_owner_all" ON public.study_goals;
DROP POLICY IF EXISTS "study_goals_select_public" ON public.study_goals;
DROP POLICY IF EXISTS "study_goals_select_room_members" ON public.study_goals;

CREATE POLICY "study_goals_select_policy" ON public.study_goals
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = study_goals.user_id AND p.is_public = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members rm_author
      JOIN public.room_members rm_caller ON rm_caller.room_id = rm_author.room_id
      WHERE rm_author.user_id = study_goals.user_id
        AND rm_caller.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "study_goals_insert_policy" ON public.study_goals
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "study_goals_update_policy" ON public.study_goals
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "study_goals_delete_policy" ON public.study_goals
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 3. Study Sessions: Consolidated Policies
-- ============================================================================

DROP POLICY IF EXISTS "study_sessions_owner_all" ON public.study_sessions;
DROP POLICY IF EXISTS "study_sessions_select_public" ON public.study_sessions;
DROP POLICY IF EXISTS "study_sessions_select_room_members" ON public.study_sessions;

CREATE POLICY "study_sessions_select_policy" ON public.study_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = study_sessions.goal_id
        AND (
          g.user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = g.user_id AND p.is_public = TRUE)
          OR EXISTS (
            SELECT 1 FROM public.room_members rm_author
            JOIN public.room_members rm_caller ON rm_caller.room_id = rm_author.room_id
            WHERE rm_author.user_id = g.user_id
              AND rm_caller.user_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY "study_sessions_insert_policy" ON public.study_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = study_sessions.goal_id AND g.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "study_sessions_update_policy" ON public.study_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = study_sessions.goal_id AND g.user_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = study_sessions.goal_id AND g.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "study_sessions_delete_policy" ON public.study_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = study_sessions.goal_id AND g.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 4. Study Rooms: Creator / Empty Delete Policy
-- ============================================================================

DROP POLICY IF EXISTS "study_rooms_delete_creator" ON public.study_rooms;
CREATE POLICY "study_rooms_delete_creator" ON public.study_rooms
  FOR DELETE USING (
    (SELECT auth.uid()) = created_by
    OR NOT EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = study_rooms.id)
  );

-- ============================================================================
-- 5. Switch all 8 Social RPCs to SECURITY INVOKER
-- ============================================================================

ALTER FUNCTION public.create_room(text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.list_my_rooms() SECURITY INVOKER;
ALTER FUNCTION public.join_room(text, text) SECURITY INVOKER;
ALTER FUNCTION public.leave_room(text) SECURITY INVOKER;
ALTER FUNCTION public.get_room(text) SECURITY INVOKER;
ALTER FUNCTION public.leaderboard() SECURITY INVOKER;
ALTER FUNCTION public.get_public_profile(text) SECURITY INVOKER;
ALTER FUNCTION public.reset_account() SECURITY INVOKER;

-- Internal helpers for starter data
ALTER FUNCTION public.seed_starter_subjects() SECURITY INVOKER;
ALTER FUNCTION public.create_starter_data_for(uuid) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.seed_starter_subjects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_starter_data_for(uuid) TO authenticated;

