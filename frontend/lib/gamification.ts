// Gamification profile computation. Mirrors the original Express handler in
// backend/routes/gamification.js — moved client-side for the Supabase migration
// since the input is just the caller's own sessions + subjects (RLS-protected).

export interface GamificationSession {
   id: string;
   duration_minutes: number;
   quality: number | null;
   logged_at: string;
}

export interface GamificationProfile {
   level: number;
   xp: number;
   xp_into_level: number;
   xp_for_next_level: number;
   progress_to_next: number;
   current_charge_pct: number;
   days_since_empty: number;
   longest_days_since_empty: number;
   total_sessions: number;
   total_minutes: number;
   mastered_count: number;
   achievements: { id: string; label: string; description: string; unlocked: boolean }[];
}

// XP curve: level L requires 100 * L^2 total XP (level 1 = 100, 2 = 400, 3 = 900, ...).
function levelFromXp(xp: number): number {
   return Math.max(0, Math.floor(Math.sqrt(xp / 100)));
}

function xpForLevel(level: number): number {
   return 100 * level * level;
}

const ACHIEVEMENTS: { id: string; label: string; description: string }[] = [
   { id: "first_step", label: "First Step", description: "Log your first session." },
   { id: "charged_up", label: "Charged Up", description: "7 days since your battery was last empty." },
   { id: "never_empty", label: "Never Empty", description: "30 days since your battery was last empty." },
   { id: "full_charge", label: "Full Charge", description: "Reach 100% charge." },
   { id: "marathon", label: "Marathon", description: "Log 100 total hours." },
   { id: "century", label: "Century", description: "Log 100 sessions." },
   { id: "polymath", label: "Polymath", description: "Study 5 different subjects." },
   { id: "mastered_five", label: "Sharpened", description: "Rate 5 sessions as Mastered." },
   { id: "dawn_patrol", label: "Dawn Patrol", description: "Study before 7am." },
   { id: "night_owl", label: "Night Owl", description: "Study after midnight." },
   { id: "sprint_day", label: "Sprint Day", description: "Log 10 sessions in a single day." },
];

// Hour-of-day for a UTC instant in a given IANA timezone. Falls back to UTC.
function localHour(loggedAt: string, tz: string): number {
   try {
      const fmt = new Intl.DateTimeFormat("en-US", {
         timeZone: tz,
         hour: "numeric",
         hour12: false,
      });
      return Number(fmt.format(new Date(loggedAt)));
   } catch {
      return new Date(loggedAt).getUTCHours();
   }
}

// Calendar date (YYYY-MM-DD) for a UTC instant in a given IANA timezone.
function localDateKey(loggedAt: string | Date, tz: string): string {
   try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
         timeZone: tz,
         year: "numeric",
         month: "2-digit",
         day: "2-digit",
      });
      return fmt.format(new Date(loggedAt));
   } catch {
      return new Date(loggedAt).toISOString().slice(0, 10);
   }
}

export function computeGamificationProfile(
   sessions: GamificationSession[],
   subjectNames: Set<string>,
   tz: string,
): GamificationProfile {
   // Bucket sessions into local-tz dates so the charge boundary matches the
   // user's calendar day, not UTC midnight.
   const dayMinutes = new Map<string, number>();
   for (const s of sessions) {
      const key = localDateKey(s.logged_at, tz);
      dayMinutes.set(key, (dayMinutes.get(key) ?? 0) + s.duration_minutes);
   }

   // Build a 365-day window ending today in the user's local tz.
   const todayKey = localDateKey(new Date(), tz);
   const today = new Date(`${todayKey}T00:00:00Z`);
   const daily: { date: string; minutes: number }[] = [];
   for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, minutes: dayMinutes.get(key) ?? 0 });
   }

   // Battery charge: up to +20 gain/day (capped at 120 studied minutes),
   // minus a flat -8 decay every day regardless of activity, clamped to
   // [0, 100]. charge[0] (365 days ago) anchors at 0, not derived from that
   // day's own minutes.
   const DECAY_PER_DAY = 8;
   const GAIN_CAP = 20;
   const FULL_GAIN_MINUTES = 120;
   const charge = new Array<number>(daily.length).fill(0);
   for (let i = 1; i < daily.length; i++) {
      const gain = Math.min(daily[i].minutes / FULL_GAIN_MINUTES, 1) * GAIN_CAP;
      charge[i] = Math.min(100, Math.max(0, charge[i - 1] - DECAY_PER_DAY + gain));
   }
   const currentChargePct = charge[charge.length - 1];
   const reachedFullCharge = charge.some((c) => c >= 100);

   // days_since_empty: consecutive days (ending today) where charge > 0.
   const daysSinceEmptyEndingOn = new Array<number>(daily.length).fill(0);
   for (let i = 0; i < daily.length; i++) {
      if (charge[i] > 0) {
         daysSinceEmptyEndingOn[i] = (i > 0 ? daysSinceEmptyEndingOn[i - 1] : 0) + 1;
      }
   }
   const daysSinceEmpty = daysSinceEmptyEndingOn[daysSinceEmptyEndingOn.length - 1];
   let longestDaysSinceEmpty = 0;
   for (const v of daysSinceEmptyEndingOn) if (v > longestDaysSinceEmpty) longestDaysSinceEmpty = v;

   const chargeByDate = new Map<string, number>();
   for (let i = 0; i < daily.length; i++) {
      chargeByDate.set(daily[i].date, charge[i]);
   }

   // XP: (minutes + quality bonus) × charge multiplier of the day the
   // session was logged. Multiplier ramps 1.0×-2.0× with that day's charge
   // level (computed *after* that day's own gain, so a session on a
   // just-resumed day already benefits from that day's partial charge-up).
   let totalMinutes = 0;
   let masteredCount = 0;
   let totalXp = 0;
   for (const s of sessions) {
      const base = s.duration_minutes + (s.quality ?? 0) * 10;
      const dateKey = localDateKey(s.logged_at, tz);
      const chargeOnDay = chargeByDate.get(dateKey) ?? 0;
      const multiplier = 1 + chargeOnDay / 100;
      totalMinutes += s.duration_minutes;
      if (s.quality === 5) masteredCount++;
      totalXp += Math.round(base * multiplier);
   }

   const level = levelFromXp(totalXp);
   const currentLevelXp = xpForLevel(level);
   const nextLevelXp = xpForLevel(level + 1);
   const xpIntoLevel = totalXp - currentLevelXp;
   const xpForNextLevel = nextLevelXp - currentLevelXp;
   const progressToNext =
      xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0;

   // Achievement unlocks.
   const totalHours = totalMinutes / 60;
   const hasDawn = sessions.some((s) => localHour(s.logged_at, tz) < 7);
   const hasNight = sessions.some((s) => {
      const h = localHour(s.logged_at, tz);
      return h >= 0 && h < 3;
   });
   const dayCounts = new Map<string, number>();
   for (const s of sessions) {
      const key = localDateKey(s.logged_at, tz);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
   }
   const maxDay = dayCounts.size === 0 ? 0 : Math.max(...dayCounts.values());

   const unlocked = new Set<string>();
   if (sessions.length >= 1) unlocked.add("first_step");
   if (daysSinceEmpty >= 7 || longestDaysSinceEmpty >= 7) unlocked.add("charged_up");
   if (daysSinceEmpty >= 30 || longestDaysSinceEmpty >= 30) unlocked.add("never_empty");
   if (reachedFullCharge) unlocked.add("full_charge");
   if (totalHours >= 100) unlocked.add("marathon");
   if (sessions.length >= 100) unlocked.add("century");
   if (subjectNames.size >= 5) unlocked.add("polymath");
   if (masteredCount >= 5) unlocked.add("mastered_five");
   if (hasDawn) unlocked.add("dawn_patrol");
   if (hasNight) unlocked.add("night_owl");
   if (maxDay >= 10) unlocked.add("sprint_day");

   return {
      level,
      xp: totalXp,
      xp_into_level: xpIntoLevel,
      xp_for_next_level: xpForNextLevel,
      progress_to_next: progressToNext,
      current_charge_pct: Math.round(currentChargePct),
      days_since_empty: daysSinceEmpty,
      longest_days_since_empty: longestDaysSinceEmpty,
      total_sessions: sessions.length,
      total_minutes: totalMinutes,
      mastered_count: masteredCount,
      achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) })),
   };
}
