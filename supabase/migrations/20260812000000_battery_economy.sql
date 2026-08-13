-- supabase/migrations/20260812000000_battery_economy.sql
--
-- Replaces the day-streak calculation with a gradual-drain battery: charge
-- gains up to 20 points/day (capped at 120 studied minutes) and decays a
-- flat 8 points/day regardless of activity, clamped to [0, 100]. The old
-- gap-and-island streak CTEs are replaced by a recursive CTE that walks the
-- 365-day window carrying charge[day-1] forward into charge[day]. Recursion
-- depth is fixed at 365 (one day per row) — no runaway-recursion risk.
--
-- days_since_empty / longest_days_since_empty reuse the same gap-and-island
-- technique the old migration used for streaks, just applied to `charge > 0`
-- instead of `minutes > 0`.

CREATE OR REPLACE FUNCTION public.analytics_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
   v_user_id uuid := auth.uid();
   v_daily json;
   v_hourly json;
   v_weekday json;
   v_by_subject json;
   v_total_minutes int;
   v_sessions_last_365 int;
   v_current_charge_pct int;
   v_days_since_empty int;
   v_longest_days_since_empty int;
BEGIN
   IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
   END IF;

   WITH RECURSIVE daily AS (
      SELECT d.day::date AS day,
             COALESCE(SUM(s.duration_minutes), 0)::int AS minutes,
             ROW_NUMBER() OVER (ORDER BY d.day::date) AS rn
      FROM generate_series(
         (CURRENT_DATE - INTERVAL '364 days')::date,
         CURRENT_DATE::date,
         '1 day'
      ) AS d(day)
      LEFT JOIN public.study_sessions s
         ON s.goal_id IN (SELECT id FROM public.study_goals WHERE user_id = v_user_id)
        AND (s.logged_at AT TIME ZONE 'UTC')::date = d.day::date
      GROUP BY d.day::date
   ),
   charge_walk AS (
      -- Anchor: the oldest day in the window starts at charge 0, regardless
      -- of that day's own minutes (matches the client-side charge[0] = 0).
      SELECT day, minutes, rn, 0::numeric AS charge
      FROM daily WHERE rn = 1

      UNION ALL

      SELECT d.day, d.minutes, d.rn,
         LEAST(100, GREATEST(0,
            cw.charge - 8 + LEAST(1, d.minutes::numeric / 120) * 20
         )) AS charge
      FROM daily d
      JOIN charge_walk cw ON d.rn = cw.rn + 1
   ),
   charge_with_gaps AS (
      SELECT day, charge,
         SUM(CASE WHEN charge = 0 THEN 1 ELSE 0 END) OVER (ORDER BY day DESC) AS gaps_after
      FROM charge_walk
   ),
   charged_islands AS (
      SELECT day,
         day - (ROW_NUMBER() OVER (ORDER BY day))::int AS grp
      FROM charge_walk WHERE charge > 0
   ),
   charged_run_lengths AS (
      SELECT COUNT(*) AS len FROM charged_islands GROUP BY grp
   )
   SELECT
      (SELECT json_agg(json_build_object(
                  'date', to_char(day, 'YYYY-MM-DD'),
                  'minutes', minutes
              ) ORDER BY day) FROM daily),
      (SELECT COALESCE(SUM(minutes), 0)::int FROM daily),
      (SELECT COUNT(*)::int FROM daily WHERE minutes > 0),
      (SELECT ROUND(charge)::int FROM charge_walk ORDER BY day DESC LIMIT 1),
      (SELECT COALESCE(COUNT(*), 0)::int FROM charge_with_gaps
         WHERE gaps_after = 0 AND charge > 0),
      (SELECT COALESCE(MAX(len), 0)::int FROM charged_run_lengths)
   INTO v_daily, v_total_minutes, v_sessions_last_365,
        v_current_charge_pct, v_days_since_empty, v_longest_days_since_empty;

   SELECT COALESCE(json_agg(json_build_object('hour', hour, 'minutes', minutes) ORDER BY hour), '[]'::json)
   INTO v_hourly
   FROM (
      SELECT EXTRACT(HOUR FROM s.logged_at AT TIME ZONE 'UTC')::int AS hour,
             SUM(s.duration_minutes)::int AS minutes
      FROM public.study_sessions s
      JOIN public.study_goals g ON g.id = s.goal_id
      WHERE g.user_id = v_user_id
      GROUP BY hour
   ) h;

   SELECT COALESCE(json_agg(json_build_object('dow', dow, 'minutes', minutes) ORDER BY dow), '[]'::json)
   INTO v_weekday
   FROM (
      SELECT EXTRACT(DOW FROM s.logged_at AT TIME ZONE 'UTC')::int AS dow,
             SUM(s.duration_minutes)::int AS minutes
      FROM public.study_sessions s
      JOIN public.study_goals g ON g.id = s.goal_id
      WHERE g.user_id = v_user_id
      GROUP BY dow
   ) w;

   SELECT COALESCE(json_agg(json_build_object('subject', subject, 'minutes', minutes) ORDER BY minutes DESC), '[]'::json)
   INTO v_by_subject
   FROM (
      SELECT sub.name AS subject,
             SUM(s.duration_minutes)::int AS minutes
      FROM public.study_sessions s
      JOIN public.study_goals g ON g.id = s.goal_id
      JOIN public.goal_subjects gs ON gs.goal_id = g.id
      JOIN public.subjects sub ON sub.id = gs.subject_id
      WHERE g.user_id = v_user_id
      GROUP BY sub.name
   ) bs;

   RETURN json_build_object(
      'daily', COALESCE(v_daily, '[]'::json),
      'hourly', v_hourly,
      'weekday', v_weekday,
      'by_subject', v_by_subject,
      'totals', json_build_object(
         'minutes', v_total_minutes,
         'sessions_last_365', v_sessions_last_365,
         'current_charge_pct', v_current_charge_pct,
         'days_since_empty', v_days_since_empty,
         'longest_days_since_empty', v_longest_days_since_empty
      )
   );
END;
$$;
