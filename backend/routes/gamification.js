import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// XP curve: level L requires 100 * L^2 total XP.
// Level 1 = 100 XP, Level 2 = 400 XP, Level 3 = 900 XP, ...
function levelFromXp(xp) {
  return Math.max(0, Math.floor(Math.sqrt(xp / 100)));
}
function xpForLevel(level) {
  return 100 * level * level;
}

// Visual pet/plant stages keyed to level
const PET_STAGES = [
  { level: 0, key: "seed" },
  { level: 1, key: "sprout" },
  { level: 4, key: "sapling" },
  { level: 8, key: "young_tree" },
  { level: 14, key: "mature_tree" },
  { level: 22, key: "blooming" },
];

function stageForLevel(level) {
  let current = PET_STAGES[0];
  for (const stage of PET_STAGES) {
    if (level >= stage.level) current = stage;
    else break;
  }
  return current.key;
}

const ACHIEVEMENTS = [
  { id: "first_step", label: "First Step", description: "Log your first session." },
  { id: "hot_streak", label: "Hot Streak", description: "7 days in a row." },
  { id: "dedicated", label: "Dedicated", description: "30 days in a row." },
  { id: "marathon", label: "Marathon", description: "Log 100 total hours." },
  { id: "century", label: "Century", description: "Log 100 sessions." },
  { id: "polymath", label: "Polymath", description: "Study 5 different subjects." },
  { id: "mastered_five", label: "Sharpened", description: "Rate 5 sessions as Mastered." },
  { id: "dawn_patrol", label: "Dawn Patrol", description: "Study before 7am." },
  { id: "night_owl", label: "Night Owl", description: "Study after midnight." },
  { id: "sprint_day", label: "Sprint Day", description: "Log 10 sessions in a single day." },
];

router.get("/profile", async (req, res) => {
  const userId = req.userId;

  const { rows: sessionsRows } = await pool.query(
    `SELECT s.id, s.duration_minutes, s.quality, s.logged_at
     FROM study_sessions s
     JOIN study_goals g ON g.id = s.goal_id
     WHERE g.user_id = $1`,
    [userId],
  );

  const { rows: subjectsRows } = await pool.query(
    `SELECT DISTINCT sub.name
     FROM goal_subjects gs
     JOIN subjects sub ON sub.id = gs.subject_id
     JOIN study_goals g ON g.id = gs.goal_id
     WHERE g.user_id = $1`,
    [userId],
  );

  // Core XP: minutes + quality bonus (quality * 10)
  let totalMinutes = 0;
  let masteredCount = 0;
  const xpBySession = sessionsRows.map((s) => {
    const base = s.duration_minutes;
    const qualityBonus = (s.quality ?? 0) * 10;
    totalMinutes += s.duration_minutes;
    if (s.quality === 5) masteredCount++;
    return base + qualityBonus;
  });
  const totalXp = xpBySession.reduce((a, b) => a + b, 0);
  const level = levelFromXp(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpForNextLevel = nextLevelXp - currentLevelXp;
  const progressToNext =
    xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0;

  // Streaks (reuse analytics logic but scoped here)
  const { rows: daily } = await pool.query(
    `SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(s.duration_minutes), 0)::int AS minutes
     FROM generate_series(
       (CURRENT_DATE - INTERVAL '364 days')::date,
       CURRENT_DATE::date,
       '1 day'
     ) AS d(day)
     LEFT JOIN study_sessions s
       ON s.goal_id IN (SELECT id FROM study_goals WHERE user_id = $1)
      AND (s.logged_at AT TIME ZONE 'UTC')::date = d.day
     GROUP BY d.day
     ORDER BY d.day`,
    [userId],
  );
  let currentStreak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].minutes > 0) currentStreak++;
    else break;
  }
  let longestStreak = 0;
  let run = 0;
  for (const row of daily) {
    if (row.minutes > 0) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // Achievement unlocks
  const totalHours = totalMinutes / 60;
  const subjectCount = subjectsRows.length;
  const hasDawn = sessionsRows.some(
    (s) => new Date(s.logged_at).getUTCHours() < 7,
  );
  const hasNight = sessionsRows.some(
    (s) => new Date(s.logged_at).getUTCHours() >= 0 && new Date(s.logged_at).getUTCHours() < 3,
  );
  const dayCounts = new Map();
  for (const s of sessionsRows) {
    const key = new Date(s.logged_at).toISOString().slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const maxDay = Math.max(0, ...dayCounts.values());

  const unlocked = new Set();
  if (sessionsRows.length >= 1) unlocked.add("first_step");
  if (currentStreak >= 7 || longestStreak >= 7) unlocked.add("hot_streak");
  if (currentStreak >= 30 || longestStreak >= 30) unlocked.add("dedicated");
  if (totalHours >= 100) unlocked.add("marathon");
  if (sessionsRows.length >= 100) unlocked.add("century");
  if (subjectCount >= 5) unlocked.add("polymath");
  if (masteredCount >= 5) unlocked.add("mastered_five");
  if (hasDawn) unlocked.add("dawn_patrol");
  if (hasNight) unlocked.add("night_owl");
  if (maxDay >= 10) unlocked.add("sprint_day");

  res.json({
    level,
    xp: totalXp,
    xp_into_level: xpIntoLevel,
    xp_for_next_level: xpForNextLevel,
    progress_to_next: progressToNext,
    pet_stage: stageForLevel(level),
    current_streak_days: currentStreak,
    longest_streak_days: longestStreak,
    total_sessions: sessionsRows.length,
    total_minutes: totalMinutes,
    mastered_count: masteredCount,
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) })),
  });
});

export default router;
