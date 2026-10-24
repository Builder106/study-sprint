-- Optimize RLS policies and add missing foreign key covering indexes.
-- Resolves Supabase Performance Advisor warnings (auth_rls_initplan and unindexed_foreign_keys).
-- Wrapping auth.uid() in (SELECT auth.uid()) allows Postgres to evaluate user credentials
-- as an InitPlan subquery once per statement rather than re-evaluating row-by-row.

-- ============================================================================
-- 1. Profiles Policies
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_public_or_own" ON public.profiles;
CREATE POLICY "profiles_select_public_or_own" ON public.profiles
  FOR SELECT USING (is_public OR (SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- 2. Study Goals Policies
-- ============================================================================

DROP POLICY IF EXISTS "study_goals_owner_all" ON public.study_goals;
CREATE POLICY "study_goals_owner_all" ON public.study_goals
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 3. Goal Subjects Policies
-- ============================================================================

DROP POLICY IF EXISTS "goal_subjects_owner_all" ON public.goal_subjects;
CREATE POLICY "goal_subjects_owner_all" ON public.goal_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = goal_subjects.goal_id AND g.user_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_goals g
      WHERE g.id = goal_subjects.goal_id AND g.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 4. Study Sessions Policies
-- ============================================================================

DROP POLICY IF EXISTS "study_sessions_owner_all" ON public.study_sessions;
CREATE POLICY "study_sessions_owner_all" ON public.study_sessions
  FOR ALL USING (
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

-- ============================================================================
-- 5. User Google Tokens Policies
-- ============================================================================

DROP POLICY IF EXISTS "user_google_tokens_owner_all" ON public.user_google_tokens;
CREATE POLICY "user_google_tokens_owner_all" ON public.user_google_tokens
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 6. Study Rooms Policies
-- ============================================================================

DROP POLICY IF EXISTS "study_rooms_insert_creator" ON public.study_rooms;
CREATE POLICY "study_rooms_insert_creator" ON public.study_rooms
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "study_rooms_update_creator" ON public.study_rooms;
CREATE POLICY "study_rooms_update_creator" ON public.study_rooms
  FOR UPDATE USING ((SELECT auth.uid()) = created_by) WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "study_rooms_delete_creator" ON public.study_rooms;
CREATE POLICY "study_rooms_delete_creator" ON public.study_rooms
  FOR DELETE USING ((SELECT auth.uid()) = created_by);

-- ============================================================================
-- 7. Room Members Policies
-- ============================================================================

DROP POLICY IF EXISTS "room_members_select_members" ON public.room_members;
CREATE POLICY "room_members_select_members" ON public.room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm2
      WHERE rm2.room_id = room_members.room_id AND rm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "room_members_insert_self" ON public.room_members;
CREATE POLICY "room_members_insert_self" ON public.room_members
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "room_members_delete_self" ON public.room_members;
CREATE POLICY "room_members_delete_self" ON public.room_members
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 8. Missing Foreign Key Covering Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS goal_subjects_subject_id_idx ON public.goal_subjects (subject_id);
CREATE INDEX IF NOT EXISTS oauth_states_user_id_idx ON public.oauth_states (user_id);
CREATE INDEX IF NOT EXISTS study_rooms_created_by_idx ON public.study_rooms (created_by);

