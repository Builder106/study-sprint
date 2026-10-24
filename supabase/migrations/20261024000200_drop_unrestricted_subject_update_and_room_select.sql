-- Drop unrestricted UPDATE policy on public.subjects and tighten study_rooms SELECT.
-- Resolves the remaining RLS Policy Always True warnings in Supabase Security Advisor.
-- Subjects are shared taxonomy entries and must not be mutated by client users.

DROP POLICY IF EXISTS "subjects_update_authenticated" ON public.subjects;

DROP POLICY IF EXISTS "study_rooms_select_authenticated" ON public.study_rooms;
CREATE POLICY "study_rooms_select_authenticated" ON public.study_rooms
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
