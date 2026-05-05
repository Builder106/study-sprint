-- View: goals_with_stats
-- Pre-aggregates logged_minutes (sum of session durations) and subjects (array
-- of subject names) per goal. RLS on the underlying tables filters this to
-- only show the caller's own goals; security_invoker ensures RLS evaluates
-- against the calling user, not the view creator.

CREATE OR REPLACE VIEW public.goals_with_stats
WITH (security_invoker = true) AS
SELECT
  g.id,
  g.user_id,
  g.title,
  g.description,
  g.target_hours,
  g.status,
  g.target_date,
  g.created_at,
  g.updated_at,
  COALESCE((
    SELECT SUM(duration_minutes)::int
    FROM public.study_sessions
    WHERE goal_id = g.id
  ), 0) AS logged_minutes,
  COALESCE((
    SELECT array_agg(subj.name ORDER BY subj.name)
    FROM public.goal_subjects gs
    JOIN public.subjects subj ON subj.id = gs.subject_id
    WHERE gs.goal_id = g.id
  ), '{}'::text[]) AS subjects
FROM public.study_goals g;

-- Subjects: allow authenticated users to insert new subject names. Names are
-- a shared/global namespace (UNIQUE constraint deduplicates), so this is safe.
CREATE POLICY "subjects_insert_authenticated" ON public.subjects
  FOR INSERT TO authenticated WITH CHECK (true);

-- RPC: set the subject list on a goal in one round-trip (upsert subjects by
-- name, replace goal_subjects rows). SECURITY INVOKER so the caller's RLS on
-- study_goals (must be owner) and goal_subjects (must own parent goal) apply.
CREATE OR REPLACE FUNCTION public.set_goal_subjects(p_goal_id uuid, p_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_subject_id uuid;
BEGIN
  DELETE FROM public.goal_subjects WHERE goal_id = p_goal_id;

  IF p_names IS NULL OR array_length(p_names, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_name IN ARRAY p_names LOOP
    v_name := trim(v_name);
    CONTINUE WHEN v_name = '';

    INSERT INTO public.subjects (name) VALUES (v_name)
    ON CONFLICT (name) DO UPDATE SET name = excluded.name
    RETURNING id INTO v_subject_id;

    INSERT INTO public.goal_subjects (goal_id, subject_id)
    VALUES (p_goal_id, v_subject_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
