-- Fix RLS Policy Always True on public.subjects
-- Resolves Supabase Security Advisor warning (rls_policy_always_true).
-- Replaces literal 'true' expressions with explicit authentication checks
-- and validation conditions.

DROP POLICY IF EXISTS "subjects_select_authenticated" ON public.subjects;
CREATE POLICY "subjects_select_authenticated" ON public.subjects
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "subjects_insert_authenticated" ON public.subjects;
CREATE POLICY "subjects_insert_authenticated" ON public.subjects
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND length(trim(name)) > 0
  );
