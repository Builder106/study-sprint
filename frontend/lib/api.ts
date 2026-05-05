import { supabase } from "./supabase";
import type { TablesUpdate } from "./database.types";
import type { Goal, GoalStatus, StudySession } from "./types";

const API_BASE =
   (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
   "http://localhost:4000";

async function getAuthToken(): Promise<string | null> {
   const { data } = await supabase.auth.getSession();
   return data.session?.access_token ?? null;
}

async function getUserId(): Promise<string> {
   const { data } = await supabase.auth.getSession();
   if (!data.session) throw new ApiError(401, "Not authenticated");
   return data.session.user.id;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
   const headers = new Headers(options.headers);
   if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
   }
   const token = await getAuthToken();
   if (token) headers.set("Authorization", `Bearer ${token}`);

   const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

   if (res.status === 401) throw new ApiError(401, "Unauthorized");
   if (res.status === 204) return undefined as T;

   const data = res.headers.get("content-type")?.includes("application/json")
      ? await res.json()
      : null;

   if (!res.ok) {
      throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
   }
   return data as T;
}

export class ApiError extends Error {
   status: number;
   constructor(status: number, message: string) {
      super(message);
      this.status = status;
   }
}

// Phase 2.3a — goal CRUD now goes direct to Supabase Postgres (RLS-protected).

interface GoalRow {
   id: string;
   title: string;
   description: string | null;
   target_hours: number | string;
   status: GoalStatus;
   target_date: string | null;
   created_at: string;
   updated_at: string;
   logged_minutes: number | null;
   subjects: string[] | null;
}

function rowToGoal(row: GoalRow | null | undefined): Goal {
   if (!row) throw new ApiError(404, "Goal not found");
   return {
      id: row.id,
      title: row.title,
      description: row.description,
      target_hours: row.target_hours,
      status: row.status,
      target_date: row.target_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      logged_minutes: row.logged_minutes ?? 0,
      subjects: row.subjects ?? [],
   };
}

async function listGoalsImpl(): Promise<{ goals: Goal[] }> {
   const { data, error } = await supabase
      .from("goals_with_stats")
      .select("*")
      .order("created_at", { ascending: false });
   if (error) throw new ApiError(500, error.message);
   return { goals: (data ?? []).map((r) => rowToGoal(r as GoalRow)) };
}

async function getGoalImpl(id: string): Promise<{ goal: Goal }> {
   const { data, error } = await supabase
      .from("goals_with_stats")
      .select("*")
      .eq("id", id)
      .maybeSingle();
   if (error) throw new ApiError(500, error.message);
   if (!data) throw new ApiError(404, "Goal not found");
   return { goal: rowToGoal(data as GoalRow) };
}

interface CreateGoalInput {
   title: string;
   description?: string;
   target_hours: number;
   status?: string;
   target_date?: string | null;
   subjects?: string[];
}

async function createGoalImpl(input: CreateGoalInput): Promise<{ goal: Goal }> {
   const userId = await getUserId();
   const { data: inserted, error } = await supabase
      .from("study_goals")
      .insert({
         user_id: userId,
         title: input.title,
         description: input.description ?? null,
         target_hours: input.target_hours,
         status: (input.status as GoalStatus) ?? "Active",
         target_date: input.target_date ?? null,
      })
      .select("id")
      .single();
   if (error) throw new ApiError(500, error.message);

   if (input.subjects && input.subjects.length > 0) {
      const { error: rpcError } = await supabase.rpc("set_goal_subjects", {
         p_goal_id: inserted.id,
         p_names: input.subjects,
      });
      if (rpcError) throw new ApiError(500, rpcError.message);
   }

   return getGoalImpl(inserted.id);
}

interface UpdateGoalInput {
   title?: string;
   description?: string;
   target_hours?: number;
   status?: string;
   target_date?: string | null;
   subjects?: string[];
}

async function updateGoalImpl(
   id: string,
   input: UpdateGoalInput,
): Promise<{ goal: Goal }> {
   const updateFields: TablesUpdate<"study_goals"> = {};
   if ("title" in input && input.title !== undefined) updateFields.title = input.title;
   if ("description" in input) updateFields.description = input.description ?? null;
   if ("target_hours" in input && input.target_hours !== undefined) updateFields.target_hours = input.target_hours;
   if ("status" in input && input.status !== undefined) updateFields.status = input.status;
   if ("target_date" in input) updateFields.target_date = input.target_date ?? null;

   if (Object.keys(updateFields).length > 0) {
      updateFields.updated_at = new Date().toISOString();
      const { error } = await supabase
         .from("study_goals")
         .update(updateFields)
         .eq("id", id);
      if (error) throw new ApiError(500, error.message);
   }

   if (input.subjects !== undefined) {
      const { error } = await supabase.rpc("set_goal_subjects", {
         p_goal_id: id,
         p_names: input.subjects ?? [],
      });
      if (error) throw new ApiError(500, error.message);
   }

   return getGoalImpl(id);
}

async function deleteGoalImpl(id: string): Promise<void> {
   const { error } = await supabase.from("study_goals").delete().eq("id", id);
   if (error) throw new ApiError(500, error.message);
}

// Endpoints below still hit Express until each Phase 2 sub-task migrates them
// to direct supabase-js queries (sessions, profile) or RPCs (analytics,
// gamification, leaderboard, rooms) or — for secret-bearing routes — Deno
// Edge Functions in Phase 3.

export const api = {
   listGoals: listGoalsImpl,
   getGoal: (id: string) => getGoalImpl(id),
   createGoal: createGoalImpl,
   updateGoal: (id: string, input: UpdateGoalInput) => updateGoalImpl(id, input),
   deleteGoal: (id: string) => deleteGoalImpl(id),

   listSessions(goalId: string) {
      return request<{ sessions: StudySession[] }>(`/api/goals/${goalId}/sessions`);
   },
   createSession(
      goalId: string,
      input: {
         duration_minutes: number;
         notes?: string;
         logged_at?: string;
         quality?: number | null;
      },
   ) {
      return request<{ session: StudySession }>(`/api/goals/${goalId}/sessions`, {
         method: "POST",
         body: JSON.stringify(input),
      });
   },
   updateSession(
      sessionId: string,
      input: Partial<{ duration_minutes: number; notes: string; quality: number | null }>,
   ) {
      return request<{ session: StudySession }>(`/api/sessions/${sessionId}`, {
         method: "PUT",
         body: JSON.stringify(input),
      });
   },
   deleteSession(sessionId: string) {
      return request<void>(`/api/sessions/${sessionId}`, { method: "DELETE" });
   },

   analyticsSummary() {
      return request<{
         daily: { date: string; minutes: number }[];
         hourly: { hour: number; minutes: number }[];
         weekday: { dow: number; minutes: number }[];
         by_subject: { subject: string; minutes: number }[];
         totals: {
            minutes: number;
            sessions_last_365: number;
            current_streak_days: number;
            longest_streak_days: number;
         };
      }>("/api/analytics/summary");
   },

   gamificationProfile() {
      return request<{
         level: number;
         xp: number;
         xp_into_level: number;
         xp_for_next_level: number;
         progress_to_next: number;
         pet_stage:
            | "seed"
            | "sprout"
            | "sapling"
            | "young_tree"
            | "mature_tree"
            | "blooming";
         current_streak_days: number;
         longest_streak_days: number;
         total_sessions: number;
         total_minutes: number;
         mastered_count: number;
         achievements: {
            id: string;
            label: string;
            description: string;
            unlocked: boolean;
         }[];
      }>(
         `/api/gamification/profile?tz=${encodeURIComponent(
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
         )}`,
      );
   },

   googleStatus() {
      return request<{ configured: boolean; connected: boolean }>(
         "/api/integrations/google/status",
      );
   },
   googleAuthUrl() {
      return request<{ url: string }>("/api/integrations/google/auth-url", {
         method: "POST",
      });
   },
   googleDisconnect() {
      return request<void>("/api/integrations/google", { method: "DELETE" });
   },
   googleExportSession(sessionId: string) {
      return request<{ event_id: string; html_link: string }>(
         `/api/integrations/google/export-session/${sessionId}`,
         { method: "POST" },
      );
   },
   googleUpcomingEvents(opts?: { from?: string; to?: string }) {
      const qs = new URLSearchParams();
      if (opts?.from) qs.set("from", opts.from);
      if (opts?.to) qs.set("to", opts.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<{
         events: {
            id: string;
            summary: string;
            start: string | null;
            end: string | null;
            all_day: boolean;
            html_link: string;
            imported: { session_id: string; goal_id: string; goal_title: string } | null;
         }[];
      }>(`/api/integrations/google/upcoming-events${suffix}`);
   },
   googleImportEvent(eventId: string, goalId: string) {
      return request<{ session: StudySession }>(
         "/api/integrations/google/import-event",
         {
            method: "POST",
            body: JSON.stringify({ event_id: eventId, goal_id: goalId }),
         },
      );
   },

   resetAccount() {
      return request<{ ok: boolean; message: string }>("/api/admin/reset", {
         method: "POST",
      });
   },

   getMyProfile() {
      return request<{
         user: {
            id: string;
            email: string;
            username: string | null;
            display_name: string | null;
            bio: string | null;
            is_public: boolean;
         };
      }>("/api/profiles/me");
   },
   updateMyProfile(input: {
      username?: string;
      display_name?: string | null;
      bio?: string | null;
      is_public?: boolean;
   }) {
      return request<{
         user: {
            id: string;
            email: string;
            username: string | null;
            display_name: string | null;
            bio: string | null;
            is_public: boolean;
         };
      }>("/api/profiles/me", {
         method: "PUT",
         body: JSON.stringify(input),
      });
   },
   getProfile(username: string) {
      return request<{
         user: { username: string; display_name: string; bio: string | null; joined_at: string };
         stats: { total_minutes: number; total_sessions: number; total_goals: number };
         recent_sessions: { duration_minutes: number; logged_at: string; goal_title: string }[];
      }>(`/api/profiles/${encodeURIComponent(username)}`);
   },
   leaderboard() {
      return request<{
         entries: { username: string; display_name: string | null; weekly_minutes: number }[];
      }>("/api/leaderboard");
   },
   listRooms() {
      return request<{
         rooms: {
            slug: string;
            name: string;
            description: string | null;
            created_at: string;
            has_passcode: boolean;
            member_count: number;
         }[];
      }>("/api/rooms");
   },
   createRoom(input: { name: string; description?: string; passcode?: string }) {
      return request<{ slug: string }>("/api/rooms", {
         method: "POST",
         body: JSON.stringify(input),
      });
   },
   getRoom(slug: string) {
      return request<{
         room: {
            slug: string;
            name: string;
            description: string | null;
            created_at: string;
            is_owner: boolean;
            has_passcode: boolean;
         };
         members: {
            username: string | null;
            display_name: string | null;
            is_public: boolean;
            joined_at: string;
         }[];
         recent_activity: {
            id: string;
            duration_minutes: number;
            logged_at: string;
            username: string | null;
            display_name: string | null;
            goal_title: string;
         }[];
      }>(`/api/rooms/${encodeURIComponent(slug)}`);
   },
   joinRoom(slug: string, passcode?: string) {
      return request<{ ok: boolean }>(`/api/rooms/${encodeURIComponent(slug)}/join`, {
         method: "POST",
         body: JSON.stringify({ passcode }),
      });
   },
   leaveRoom(slug: string) {
      return request<void>(`/api/rooms/${encodeURIComponent(slug)}/leave`, {
         method: "POST",
      });
   },

   async parseSyllabus(input: { text?: string; file?: File }) {
      const headers = new Headers();
      const token = await getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      let body: BodyInit;
      if (input.file) {
         const form = new FormData();
         form.append("pdf", input.file);
         if (input.text) form.append("text", input.text);
         body = form;
      } else {
         headers.set("Content-Type", "application/json");
         body = JSON.stringify({ text: input.text ?? "" });
      }
      const res = await fetch(`${API_BASE}/api/syllabus/parse`, {
         method: "POST",
         headers,
         body,
      });
      const data = res.headers.get("content-type")?.includes("application/json")
         ? await res.json()
         : null;
      if (!res.ok) {
         throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
      }
      return data as {
         goals: {
            title: string;
            description: string;
            target_hours: number;
            target_date: string | null;
            subjects: string[];
         }[];
         model: string;
      };
   },
};
